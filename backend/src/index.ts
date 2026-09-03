import { Elysia } from "elysia";
import { openapi } from "@elysia/openapi";
import { cors } from "@elysia/cors";
import { sql } from "drizzle-orm";

import { database } from "./config/database";
import { PORT, FRONTEND_URL } from "./config/env";
import { adminRoutes } from "./routes/admin.routes";
import { employeeRoutes } from "./routes/employee.routes";
import { partnersRoutes } from "./routes/partners.routes";

async function initializeDatabase() {
  await database.execute(sql`select 1`);
  console.log("Database connection established successfully");
}

async function start() {
  try {
    await initializeDatabase();

    const app = new Elysia()
      .use(
        cors({
          origin: FRONTEND_URL,
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          allowedHeaders: ["Content-Type", "Authorization"],
        })
      )
      .use(
        openapi({
          provider: "swagger-ui",
          openapiVersion: "3.0.3",
          documentation: {
            info: {
              title: "API Ticket Tout",
              version: "1.0.0",
            },
          },
        })
      )
      .get("/health", () => ({ status: "ok" as const }))
      .get("/", () => "Hello Ticket Tout")
      .use(adminRoutes)
      .use(partnersRoutes)
      .use(employeeRoutes)
      .listen(PORT);

    console.log(`Elysia is running on port ${app.server?.port}`);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

start();
