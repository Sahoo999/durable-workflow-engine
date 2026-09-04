import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import { taskApprovals } from "../schema.js";

export const createTaskApproval = async (
  taskId: string,
) => {
  const [approval] = await db
    .insert(taskApprovals)
    .values({
      taskId,
      status: "PENDING",
    })
    .returning();

  if (!approval) {
    throw new Error("Failed to create approval");
  }

  return approval;
};

export const getApprovalById = async (
  approvalId: string,
) => {
  const result = await db
    .select()
    .from(taskApprovals)
    .where(eq(taskApprovals.id, approvalId))
    .limit(1);

  return result[0] ?? null;
};

export const resolveApproval = async ({
  approvalId,
  status,
  resolvedBy,
}: {
  approvalId: string;
  status: "APPROVED" | "REJECTED";
  resolvedBy: string;
}) => {
  const [approval] = await db
    .update(taskApprovals)
    .set({
      status,
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(taskApprovals.id, approvalId),
        eq(taskApprovals.status, "PENDING"),
      ),
    )
    .returning();

  if (!approval) {
    throw new Error(
      "Approval does not exist or is already resolved",
    );
  }

  return approval;
};

export const getPendingApprovals = async () => {
  return db
    .select()
    .from(taskApprovals)
    .where(eq(taskApprovals.status, "PENDING"));
};