import { Elysia, t } from "elysia";
import { openapi } from "@elysia/openapi";
import { cors } from "@elysia/cors";
import { sql } from "drizzle-orm";

import { database } from "./config/database";
import { PORT, FRONTEND_URL } from "./config/env";
import { authRoutes } from "./routes/auth.route"
import { adminRoutes } from "./routes/admin.routes";
import { employeeRoutes } from "./routes/employee.routes";
import { partnersRoutes } from "./routes/partners.routes";

const packageJson = await Bun.file("package.json").json();

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await database.execute(sql`select 1`);
    return true
  } catch {
    return false
  }
}

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
              title: "API Carte Pro",
              version: packageJson.version,
            },
          },
        })
      )
      .get('/health', async ({ set }) => {
        const isDbHealthy = await checkDatabaseConnection()

        if (!isDbHealthy) {
          set.status = 503
          return {
            version: packageJson.version, services: { database: 'unhealthy' }
          }
        }
        return { version: packageJson.version, services: { database: 'healthy' } };
      }, {
        response: {
          200: t.Object({
            version: t.String(),
            services: t.Object({
              database: t.Literal("healthy"),
            }),
          }),
          503: t.Object({
            version: t.String(),
            services: t.Object({
              database: t.Literal("unhealthy"),
            }),
          }),
        },
      })
      .get("/", () => "Hello Carte Pro")
      .use(authRoutes)
      .use(adminRoutes)
      .use(partnersRoutes)
      .use(employeeRoutes)
      .listen(PORT);

    console.log(`Carte Pro is running on port http://${app.server?.hostname}:${app.server?.port}`);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

start();
