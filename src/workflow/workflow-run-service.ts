import {
  createWorkflowRun,
  getWorkflowByName,
  getWorkflowVersion,
} from "../db/repositories/workflow-repository.js";

export const startWorkflowRun = async ({
  workflowName,
  version,
  input,
}: {
  workflowName: string;
  version: number;
  input?: unknown;
}) => {
  const workflow =
    await getWorkflowByName(workflowName);

  if (!workflow) {
    throw new Error(
      `Workflow not found: ${workflowName}`,
    );
  }

  const workflowVersion =
    await getWorkflowVersion(
      workflow.id,
      version,
    );

  if (!workflowVersion) {
    throw new Error(
      `Workflow version not found: ${workflowName} v${version}`,
    );
  }

  return createWorkflowRun({
    workflowVersionId:
      workflowVersion.id,
    input,
  });
};