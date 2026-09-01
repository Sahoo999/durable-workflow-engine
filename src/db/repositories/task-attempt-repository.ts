import { desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import { taskAttempts } from "../schema.js";

export const getLatestAttempt = async (
  taskId: string,
) => {
  const result = await db
    .select()
    .from(taskAttempts)
    .where(eq(taskAttempts.taskId, taskId))
    .orderBy(desc(taskAttempts.attemptNumber))
    .limit(1);

  return result[0] ?? null;
};

export const createTaskAttempt = async ({
  taskId,
  attemptNumber,
  input,
  fencingToken,
}: {
  taskId: string;
  attemptNumber: number;
  input: unknown;
  fencingToken: number;
}) => {
  const [attempt] = await db
    .insert(taskAttempts)
    .values({
      taskId,
      attemptNumber,
      status: "RUNNING",
      input,
      fencingToken,
      startedAt: new Date(),
    })
    .returning();

  return attempt;
};

export const completeTaskAttempt = async (
  attemptId: string,
  output: unknown,
): Promise<void> => {
  await db
    .update(taskAttempts)
    .set({
      status: "COMPLETED",
      output,
      completedAt: new Date(),
    })
    .where(eq(taskAttempts.id, attemptId));
};

export const getNextAttemptNumber = async (
  taskId: string,
): Promise<number> => {
  const latestAttempt = await getLatestAttempt(taskId);

  return latestAttempt
    ? latestAttempt.attemptNumber + 1
    : 1;
};

export const failTaskAttempt = async (
  attemptId: string,
  error: unknown,
): Promise<void> => {
  await db
    .update(taskAttempts)
    .set({
      status: "FAILED",
      error,
      completedAt: new Date(),
    })
    .where(eq(taskAttempts.id, attemptId));
};