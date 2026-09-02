import {
  registerWorkflowDefinition,
} from "../workflow/workflow-definition-service.js";

import {
  startWorkflowRun,
} from "../workflow/workflow-run-service.js";

const main = async (): Promise<void> => {
  const workflowName =
    `versioned-demo-${Date.now()}`;

  const v1 =
    await registerWorkflowDefinition({
      name: workflowName,
      version: 1,
      tasks: [
        {
          id: "A",
          type: "hello",
        },
      ],
    });

  console.log("Created version:", v1.version);

  const run =
    await startWorkflowRun({
      workflowName,
      version: 1,
      input: {
        source: "versioning-test",
      },
    });

  console.log("Run created:", {
    runId: run.id,
    workflowVersionId:
      run.workflowVersionId,
  });

  const v2 =
    await registerWorkflowDefinition({
      name: workflowName,
      version: 2,
      tasks: [
        {
          id: "A",
          type: "hello",
        },
        {
          id: "B",
          type: "hello",
          dependsOn: ["A"],
        },
      ],
    });

  console.log("Created version:", v2.version);

  console.log(
    "Original run remains bound to:",
    run.workflowVersionId,
  );
};

main().catch((error) => {
  console.error(
    "Versioning test failed:",
    error,
  );
  process.exitCode = 1;
});