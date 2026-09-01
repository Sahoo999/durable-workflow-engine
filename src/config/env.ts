import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

export const env = {
  port,
  databaseUrl,
  redisUrl,
};