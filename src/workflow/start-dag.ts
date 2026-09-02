import { dispatchReadyTasks } from "./workflow-orchestrator.js";

const main = async (): Promise<void> => {
  const workflowRunId = process.argv[2];

  if (!workflowRunId) {
    throw new Error(
      "Usage: npx tsx src/workflow/start-dag.ts <workflowRunId>",
    );
  }

  const count = await dispatchReadyTasks(workflowRunId);

  console.log("Initial tasks dispatched:", count);
};

main().catch((error) => {
  console.error("DAG start failed:", error);
  process.exitCode = 1;
});