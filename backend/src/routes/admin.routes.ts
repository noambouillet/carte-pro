import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { adminAgents } from "../../db/drizzle/schema";
import { database } from "../config/database";
import { authPlugin, requireAdmin, verifyPassword } from "../middleware/auth";
import { fetchTransactionHistoryCsv } from "../scripts/export";
import openapi from "@elysia/openapi";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .use(authPlugin)
  .use(openapi())
  .get("/accounts", "Accounts", { beforeHandle: requireAdmin })
  .get("/scoreboard", "Scoreboard", { beforeHandle: requireAdmin })
  .post("/validate", "Log in", { beforeHandle: requireAdmin })
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const [admin] = await database
        .select({
          id: adminAgents.id,
          passwordHash: adminAgents.passwordHash,
        })
        .from(adminAgents)
        .where(eq(adminAgents.email, body.email))
        .limit(1);

      if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
        set.status = 401;
        return { error: "invalid_credentials" };
      }
      const token = await jwt.sign({
        sub: String(admin.id),
        role: "admin",
      });
      return { token };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  .get("/transactions.csv", async ({ set }) => {
      const csv = await fetchTransactionHistoryCsv(database);

      set.headers["content-type"] = "text/csv; charset=utf-8";
      set.headers["content-disposition"] = 'attachment; filename="transactions.csv"';
      return csv;
    },
    {
      beforeHandle: requireAdmin,
    }
  );
