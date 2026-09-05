import { desc, eq } from "drizzle-orm";

import { db } from "../client.js";

import { deadLetterTasks } from "../schema.js";

export const getDeadLetterEntries = async () => {
  return db
    .select()
    .from(deadLetterTasks)
    .orderBy(desc(deadLetterTasks.createdAt));
};

export const getDeadLetterEntryByTaskId = async (
  taskId: string,
) => {
  const result = await db
    .select()
    .from(deadLetterTasks)
    .where(eq(deadLetterTasks.taskId, taskId))
    .limit(1);

  return result[0] ?? null;
};

export const deleteDeadLetterEntry = async (
  id: string,
): Promise<void> => {
  await db
    .delete(deadLetterTasks)
    .where(eq(deadLetterTasks.id, id));
};

export const addToDeadLetterQueue = async ({
  taskId,
  reason,
}: {
  taskId: string;
  reason: unknown;
}) => {
  const [entry] = await db
    .insert(deadLetterTasks)
    .values({
      taskId,
      reason,
    })
    .returning();

  if (!entry) {
    throw new Error(
      "Failed to add task to dead letter queue",
    );
  }

  return entry;
};