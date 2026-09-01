import { FastifyInstance } from "fastify";
import { pool } from "../db/client.js";

export const registerRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.get("/health", async () => {
    try {
      await pool.query("SELECT 1");

      return {
        status: "ok",
        database: "up",
      };
    } catch {
      return {
        status: "degraded",
        database: "down",
      };
    }
  });

  app.get("/workflows", async () => {
    const result = await pool.query(
      "SELECT 1 AS database_connection",
    );

    return {
      workflows: [],
      database: result.rows[0].database_connection === 1,
    };
  });
};