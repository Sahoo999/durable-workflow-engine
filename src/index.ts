import Fastify from "fastify";
import cors from "@fastify/cors";

import { registerRoutes } from "./api/routes.js";
import { startTracing } from "./observability/tracing.js";
import { env } from "./config/env.js";

startTracing();

const app = Fastify({
  logger: true,
});

const start = async (): Promise<void> => {
  try {
   await app.register(cors, {
  origin:
  process.env.FRONTEND_URL ??
   /^http:\/\/localhost:\d+$/,
});

    await registerRoutes(app);

    await app.listen({
      port: env.port,
      host: "0.0.0.0",
    });

    console.log(
      `Server listening on port ${env.port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});