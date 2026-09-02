import { and, desc, eq, lt } from "drizzle-orm";
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
  workerId,
  fencingToken,
}: {
  taskId: string;
  attemptNumber: number;
  input: unknown;
  workerId: string;
  fencingToken: number;
}) => {
  const [attempt] = await db
    .insert(taskAttempts)
    .values({
      taskId,
      attemptNumber,
      status: "RUNNING",
      workerId,
      input,
      fencingToken,
      startedAt: new Date(),
    })
    .returning();

  return attempt;
};

export const completeTaskAttempt = async (
  attemptId: string,
  fencingToken: number,
  output: unknown,
): Promise<void> => {
  const result = await db
    .update(taskAttempts)
    .set({
      status: "COMPLETED",
      output,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(taskAttempts.id, attemptId),
        eq(taskAttempts.fencingToken, fencingToken),
        eq(taskAttempts.status, "RUNNING"),
      ),
    )
    .returning({ id: taskAttempts.id });

  if (result.length === 0) {
    throw new Error(
      `Fencing violation: attempt ${attemptId} is no longer active`,
    );
  }
};

export const failTaskAttempt = async (
  attemptId: string,
  fencingToken: number,
  error: unknown,
): Promise<void> => {
  const result = await db
    .update(taskAttempts)
    .set({
      status: "FAILED",
      error,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(taskAttempts.id, attemptId),
        eq(taskAttempts.fencingToken, fencingToken),
        eq(taskAttempts.status, "RUNNING"),
      ),
    )
    .returning({ id: taskAttempts.id });

  if (result.length === 0) {
    throw new Error(
      `Fencing violation: attempt ${attemptId} is no longer active`,
    );
  }
};

export const getNextAttemptNumber = async (
  taskId: string,
): Promise<number> => {
  const latestAttempt = await getLatestAttempt(taskId);

  return latestAttempt
    ? latestAttempt.attemptNumber + 1
    : 1;
};


export const updateTaskAttemptHeartbeat = async (
  attemptId: string,
): Promise<void> => {
  await db
    .update(taskAttempts)
    .set({
      lastHeartbeatAt: new Date(),
    })
    .where(eq(taskAttempts.id, attemptId));
};

export const failStaleTaskAttempt = async (
  attemptId: string,
  staleBefore: Date,
  error: unknown,
): Promise<{
  id: string;
  taskId: string;
  attemptNumber: number;
} | null> => {
  const result = await db
    .update(taskAttempts)
    .set({
      status: "FAILED",
      error,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(taskAttempts.id, attemptId),
        eq(taskAttempts.status, "RUNNING"),
        lt(taskAttempts.lastHeartbeatAt, staleBefore),
      ),
    )
    .returning({
      id: taskAttempts.id,
      taskId: taskAttempts.taskId,
      attemptNumber: taskAttempts.attemptNumber,
    });

  return result[0] ?? null;
};