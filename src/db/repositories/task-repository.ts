import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import { tasks } from "../schema.js";
import type { TaskStatus } from "../../types/task.js";

export const getTaskById = async (
  taskId: string,
) => {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return result[0] ?? null;
};

export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
): Promise<void> => {
  await db
    .update(tasks)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));
};

export const completeTaskIfRunning = async (
  taskId: string,
): Promise<void> => {
  const result = await db
    .update(tasks)
    .set({
      status: "COMPLETED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.status, "RUNNING"),
      ),
    )
    .returning({ id: tasks.id });

  if (result.length === 0) {
    throw new Error(
      `Task ${taskId} is no longer RUNNING`,
    );
  }
};