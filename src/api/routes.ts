import type { FastifyInstance } from "fastify";

import {
  getAllWorkflows,
  getLatestWorkflowVersion,
  getWorkflowByName,
  getWorkflowRunById,
} from "../db/repositories/workflow-repository.js";

import {
  getTaskById,
  getTasksByWorkflowRunId,
} from "../db/repositories/task-repository.js";

import {
  registerWorkflowDefinition,
} from "../workflow/workflow-definition-service.js";

import {
  startWorkflowRun,
} from "../workflow/workflow-run-service.js";

export const registerRoutes = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  fastify.get("/metrics", async (_request, reply) => {
    const { register } =
      await import("../observability/metrics.js");

    reply.header(
      "Content-Type",
      register.contentType,
    );

    return register.metrics();
  });

  /*
   * Create a workflow version.
   */
  fastify.post<{
    Body: {
      name: string;
      version: number;
      tasks: Array<{
        id: string;
        type: string;
        dependsOn?: string[];
      }>;
    };
  }>("/workflows", async (request, reply) => {
    try {
      const workflow =
        await registerWorkflowDefinition(
          request.body,
        );

      return reply.code(201).send(workflow);
    } catch (error) {
      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  });

  /*
   * List workflows.
   */
  fastify.get(
    "/workflows",
    async () => {
      return getAllWorkflows();
    },
  );

  /*
   * Get workflow information.
   */
  fastify.get<{
    Params: {
      name: string;
    };
  }>("/workflows/:name", async (request, reply) => {
    const workflow =
      await getWorkflowByName(
        request.params.name,
      );

    if (!workflow) {
      return reply.code(404).send({
        error: "Workflow not found",
      });
    }

    const version =
      await getLatestWorkflowVersion(
        workflow.id,
      );

    return {
      workflow,
      latestVersion: version,
    };
  });

  /*
   * Start a workflow run.
   */
  fastify.post<{
    Params: {
      name: string;
    };
    Body: {
      version: number;
      input?: unknown;
    };
  }>(
    "/workflows/:name/runs",
    async (request, reply) => {
      try {
        const run =
          await startWorkflowRun({
            workflowName:
              request.params.name,
            version: request.body.version,
            input: request.body.input,
          });

        return reply.code(201).send(run);
      } catch (error) {
        return reply.code(400).send({
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    },
  );

  /*
   * Get a workflow run.
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>("/runs/:id", async (request, reply) => {
    const run =
      await getWorkflowRunById(
        request.params.id,
      );

    if (!run) {
      return reply.code(404).send({
        error: "Workflow run not found",
      });
    }

    return run;
  });

  /*
   * Get tasks for a workflow run.
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>("/runs/:id/tasks", async (request) => {
    return getTasksByWorkflowRunId(
      request.params.id,
    );
  });

  /*
   * Get a task.
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>("/tasks/:id", async (request, reply) => {
    const task =
      await getTaskById(
        request.params.id,
      );

    if (!task) {
      return reply.code(404).send({
        error: "Task not found",
      });
    }

    return task;
  });
};

