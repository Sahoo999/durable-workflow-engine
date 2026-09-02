import { and, eq, lt } from "drizzle-orm";

import { db } from "../db/client.js";
import { taskAttempts } from "../db/schema.js";

export const findStaleAttempts = async (
  staleBefore: Date,
) => {
  return db
    .select()
    .from(taskAttempts)
    .where(
      and(
        eq(taskAttempts.status, "RUNNING"),
        lt(taskAttempts.lastHeartbeatAt, staleBefore),
      ),
    );
};