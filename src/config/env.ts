import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

const workerStaleTimeoutMs = Number(
  process.env.WORKER_STALE_TIMEOUT_MS ?? 30000,
);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

if (
  !Number.isFinite(workerStaleTimeoutMs) ||
  workerStaleTimeoutMs <= 0
) {
  throw new Error(
    "WORKER_STALE_TIMEOUT_MS must be a positive number",
  );
}

export const env = {
  port,
  databaseUrl,
  redisUrl,
  workerStaleTimeoutMs,
};