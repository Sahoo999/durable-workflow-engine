import { desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import { workers } from "../schema.js";


export const registerWorker = async ({
  workerKey,
  hostname,
}: {
  workerKey: string;
  hostname: string;
}) => {
  const [worker] = await db
    .insert(workers)
    .values({
      workerKey,
      status: "ACTIVE",
      hostname,
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
    })
    .returning();

  return worker;
};

export const getWorkerById = async (
  workerId: string,
) => {
  const result = await db
    .select()
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);

  return result[0] ?? null;
};

export const updateWorkerHeartbeat = async (
  workerId: string,
): Promise<void> => {
  await db
    .update(workers)
    .set({
      lastHeartbeatAt: new Date(),
      status: "ACTIVE",
      updatedAt: new Date(),
    })
    .where(eq(workers.id, workerId));
};

export const markWorkerOffline = async (
  workerId: string,
): Promise<void> => {
  await db
    .update(workers)
    .set({
      status: "OFFLINE",
      updatedAt: new Date(),
    })
    .where(eq(workers.id, workerId));
};

export const getWorkers = async () => {
  return db
    .select()
    .from(workers)
    .orderBy(desc(workers.createdAt));
};