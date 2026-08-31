import { FastifyInstance } from "fastify";

export const registerRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.get("/workflows", async () => {
    return {
      workflows: [],
    };
  });
};