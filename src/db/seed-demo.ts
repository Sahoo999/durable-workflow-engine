import "dotenv/config";
import { registerWorkflowDefinition } from "../workflow/workflow-definition-service.js";
import { startWorkflowRun } from "../workflow/workflow-run-service.js";

const main = async () => {
  console.log("Registering demo workflow...");

  await registerWorkflowDefinition({
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

  console.log("Done. Start a worker (`npm run worker`) to execute it, then open the dashboard.");
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});