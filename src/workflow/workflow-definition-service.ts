import {
  createWorkflow,
  createWorkflowVersion,
  getLatestWorkflowVersion,
  getWorkflowByName,
} from "../db/repositories/workflow-repository.js";

import { validateDag } from "./dag-validator.js";

interface WorkflowDefinitionTask {
  id: string;
  type: string;
  dependsOn?: string[];
}

export interface WorkflowDefinition {
  name: string;
  version: number;
  tasks: WorkflowDefinitionTask[];
}

export const registerWorkflowDefinition = async (
  definition: WorkflowDefinition,
) => {
  validateDag(definition.tasks);

  let workflow =
    await getWorkflowByName(definition.name);

  if (!workflow) {
    workflow = await createWorkflow(
      definition.name,
    );
  }

  const latestVersion =
    await getLatestWorkflowVersion(
      workflow.id,
    );

  const expectedVersion =
    latestVersion
      ? latestVersion.version + 1
      : 1;

  if (definition.version !== expectedVersion) {
    throw new Error(
      `Invalid workflow version. Expected ${expectedVersion}, received ${definition.version}`,
    );
  }

  return createWorkflowVersion({
    workflowId: workflow.id,
    version: definition.version,
    definition,
  });
};