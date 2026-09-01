import IORedis from "ioredis";
import { env } from "./env.js";

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});