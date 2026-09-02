import { db } from "./client.js";
import {
  workflows,
  workflowVersions,
  workflowRuns,
  tasks,
} from "./schema.js";

const main = async (): Promise<void> => {
  const workflowName = `dag-demo-${Date.now()}`;

  const [workflow] = await db
    .insert(workflows)
    .values({
      name: workflowName,
    })
    .returning();

  if (!workflow) {
    throw new Error("Failed to create workflow");
  }

  const definition = {
    name: workflowName,
    version: 1,
    tasks: [
      { id: "A", type: "hello", dependsOn: [] },
      { id: "B", type: "hello", dependsOn: ["A"] },
      { id: "C", type: "hello", dependsOn: ["A"] },
      { id: "D", type: "hello", dependsOn: ["B", "C"] },
    ],
  };

  const [version] = await db
    .insert(workflowVersions)
    .values({
      workflowId: workflow.id,
      version: 1,
      definition,
    })
    .returning();

  if (!version) {
    throw new Error("Failed to create workflow version");
  }

  const [run] = await db
    .insert(workflowRuns)
    .values({
      workflowVersionId: version.id,
      status: "PENDING",
    })
    .returning();

  if (!run) {
    throw new Error("Failed to create workflow run");
  }

  await db.insert(tasks).values([
    {
      workflowRunId: run.id,
      taskKey: "A",
      taskType: "hello",
      status: "PENDING",
      dependsOn: [],
    },
    {
      workflowRunId: run.id,
      taskKey: "B",
      taskType: "hello",
      status: "PENDING",
      dependsOn: ["A"],
    },
    {
      workflowRunId: run.id,
      taskKey: "C",
      taskType: "hello",
      status: "PENDING",
      dependsOn: ["A"],
    },
    {
      workflowRunId: run.id,
      taskKey: "D",
      taskType: "hello",
      status: "PENDING",
      dependsOn: ["B", "C"],
    },
  ]);

  console.log("DAG workflow created.");
  console.log({
    workflowId: workflow.id,
    workflowRunId: run.id,
    workflowName,
  });
};

main().catch((error) => {
  console.error("DAG seed failed:", error);
  process.exitCode = 1;
});