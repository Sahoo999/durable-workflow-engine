import "dotenv/config";
import { registerWorkflowDefinition } from "../workflow/workflow-definition-service.js";
import { startWorkflowRun } from "../workflow/workflow-run-service.js";
import { getTasksByWorkflowRunId } from "./repositories/task-repository.js";
import { requestApproval } from "../workflow/approval-service.js";
import { getWorkflowByName, getLatestWorkflowVersion } from "./repositories/workflow-repository.js";

const ensureWorkflow = async (definition: {
  name: string;
  version: number;
  tasks: { id: string; type: string; dependsOn?: string[] }[];
}) => {
  const existing = await getWorkflowByName(definition.name);

  if (existing) {
    const latest = await getLatestWorkflowVersion(existing.id);
    if (latest) {
      console.log(`${definition.name} already registered (v${latest.version}) — skipping.`);
      return;
    }
  }

  await registerWorkflowDefinition(definition);
};

const main = async () => {
  console.log("Registering demo workflow...");

  await ensureWorkflow({
    name: "demo-pipeline",
    version: 1,
    tasks: [
      { id: "A", type: "hello" },
      { id: "B", type: "sleep", dependsOn: ["A"] },
      { id: "C", type: "hello", dependsOn: ["A"] },
      { id: "D", type: "always-fail", dependsOn: ["B", "C"] },
    ],
  });

  console.log("Starting a demo run...");

  await startWorkflowRun({
    workflowName: "demo-pipeline",
    version: 1,
    input: {},
  });

  console.log("Registering approval-demo workflow...");

  await ensureWorkflow({
    name: "approval-demo",
    version: 1,
    tasks: [{ id: "review", type: "hello" }],
  });

  console.log("Starting approval-demo run...");

  const approvalRun = await startWorkflowRun({
    workflowName: "approval-demo",
    version: 1,
    input: {},
  });

  const [reviewTask] = await getTasksByWorkflowRunId(approvalRun.id);

  await requestApproval(reviewTask.id);

  console.log("Approval requested — check the Approvals page.");

  console.log("Done. Start a worker (`npm run worker`) to execute it, then open the dashboard.");
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});