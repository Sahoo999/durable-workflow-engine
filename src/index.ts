import Fastify from "fastify";
import { registerRoutes } from "./api/routes.js";
import { startTracing } from "./observability/tracing.js";

startTracing();

const app = Fastify({
  logger: true,
});

  registerRoutes(app);

const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: 3000,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();