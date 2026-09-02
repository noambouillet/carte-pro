import { Elysia } from "elysia";
import { openapi } from '@elysia/openapi'
import { cors } from '@elysia/cors'
import { sequelize } from "./config/database";
import { requiredEnv } from './config/env'
import { adminRoutes } from './routes/admin.routes'
import { employeeRoutes } from './routes/employee.routes'
import { partnersRoutes } from './routes/partners.routes'

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

initializeDatabase();

const app = new Elysia()
  .use(
      cors({
        origin: requiredEnv("FRONTEND_URL"),
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
  )
  .use(openapi({
    provider: 'swagger-ui',
    openapiVersion: '3.0.3',
    documentation: {
      info: {
        title: 'API Ticket Tout',
        version: '1.0.0',
      },
    },
  }))
  .get("/health", () => ({ status: "ok" as const }))
  .get("/", () => "Hello Elysia")
  .use(adminRoutes)
  .use(partnersRoutes)
  .use(employeeRoutes)
  .listen(requiredEnv("PORT"));

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
