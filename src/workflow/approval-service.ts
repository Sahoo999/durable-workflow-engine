import {
  createTaskApproval,
  getApprovalById,
  resolveApproval,
} from "../db/repositories/approval-repository.js";

import {
  getTaskById,
  updateTaskStatus,
} from "../db/repositories/task-repository.js";

import { dispatchTask } from "../queue/task-dispatcher.js";
import { and, eq } from "drizzle-orm";

export const requestApproval = async (
  taskId: string,
) => {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  await updateTaskStatus(
    task.id,
    "WAITING",
  );

  return createTaskApproval(task.id);
};

export const approveTask = async ({
  approvalId,
  resolvedBy,
}: {
  approvalId: string;
  resolvedBy: string;
}) => {
  const approval =
    await getApprovalById(approvalId);

  if (!approval) {
    throw new Error("Approval not found");
  }

  const task = await getTaskById(
    approval.taskId,
  );

  if (!task) {
    throw new Error("Task not found");
  }

  const resolved =
    await resolveApproval({
      approvalId,
      status: "APPROVED",
      resolvedBy,
    });

  await updateTaskStatus(
    task.id,
    "PENDING",
  );

  await dispatchTask({
    taskId: task.id,
    workflowRunId: task.workflowRunId,
    taskType: task.taskType,
  });

  return resolved;
};

export const rejectTask = async ({
  approvalId,
  resolvedBy,
}: {
  approvalId: string;
  resolvedBy: string;
}) => {
  const approval =
    await getApprovalById(approvalId);

  if (!approval) {
    throw new Error("Approval not found");
  }

  const task = await getTaskById(
    approval.taskId,
  );

  if (!task) {
    throw new Error("Task not found");
  }

  const resolved =
    await resolveApproval({
      approvalId,
      status: "REJECTED",
      resolvedBy,
    });

  await updateTaskStatus(
    task.id,
    "FAILED",
  );

  return resolved;
};