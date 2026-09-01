import { db } from "./client.js";
import {
  workflows,
  workflowVersions,
  workflowRuns,
  tasks,
} from "./schema.js";

const main = async (): Promise<void> => {
  const [workflow] = await db
    .insert(workflows)
    .values({
      name: "worker-demo-workflow",
    })
    .returning();

  const [version] = await db
    .insert(workflowVersions)
    .values({
      workflowId: workflow.id,
      version: 1,
      definition: {
        name: "worker-demo-workflow",
        version: 1,
        tasks: [
          {
            id: "hello-task",
            type: "hello",
          },
        ],
      },
    })
    .returning();

  const [run] = await db
    .insert(workflowRuns)
    .values({
      workflowVersionId: version.id,
      status: "RUNNING",
      input: {},
    })
    .returning();

  const [task] = await db
    .insert(tasks)
    .values({
      workflowRunId: run.id,
      taskKey: "hello-task",
      taskType: "hello",
      status: "PENDING",
      input: {
        message: "Hello from PostgreSQL",
      },
      dependsOn: [],
      maxAttempts: 3,
      backoffType: "exponential",
      timeoutMs: 30000,
    })
    .returning();

  console.log("Created development task:");
  console.log({
    workflowId: workflow.id,
    workflowVersionId: version.id,
    workflowRunId: run.id,
    taskId: task.id,
  });
};

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});