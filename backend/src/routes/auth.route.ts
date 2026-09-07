import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { database } from "../config/database";
import { employees, partners, adminAgents } from "../../db/drizzle/schema";
import { authPlugin, AUTH_COOKIE, issueSession, clearSession, verifyPassword } from "../middleware/auth";

const roleEnum = t.Union([t.Literal("employee"), t.Literal("partner"), t.Literal("admin")]);

const authRoutes = new Elysia({ prefix: "/api/v1/auth" })
  .use(authPlugin)
  .post("/login", async ({ body, jwt, cookie, set }) => {
      const { email, password } = body;

      const [adminRows, partnerRows, employeeRows] = await Promise.all([
        database
          .select({ id: adminAgents.id, passwordHash: adminAgents.passwordHash })
          .from(adminAgents)
          .where(eq(adminAgents.email, email))
          .limit(1),
        database
          .select({ id: partners.id, passwordHash: partners.passwordHash, status: partners.status })
          .from(partners)
          .where(eq(partners.email, email))
          .limit(1),
        database
          .select({ id: employees.id, passwordHash: employees.passwordHash, status: employees.status })
          .from(employees)
          .where(eq(employees.email, email))
          .limit(1),
      ]);

      const account = adminRows[0] ? { id: adminRows[0].id, passwordHash: adminRows[0].passwordHash, role: "admin" as const, status: null as string | null }
          : partnerRows[0]
          ? { id: partnerRows[0].id, passwordHash: partnerRows[0].passwordHash, role: "partner" as const, status: partnerRows[0].status }
          : employeeRows[0]
          ? { id: employeeRows[0].id, passwordHash: employeeRows[0].passwordHash, role: "employee" as const, status: employeeRows[0].status } : null;

      if (!account || !(await verifyPassword(password, account.passwordHash))) {
        set.status = 401;
        return { error: "invalid_credentials" };
      }
      if (account.role === "partner" && account.status !== "validated") {
        set.status = 403;
        return { error: "partner_not_validated", status: account.status };
      }
      if (account.role === "employee" && account.status !== "active") {
        set.status = 403;
        return { error: "account_inactive" };
      }

      await issueSession(jwt, cookie, { id: Number(account.id), role: account.role }, process.env.NODE_ENV === "production");

      return { role: account.role };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object({ role: roleEnum }),
        401: t.Object({ error: t.String() }),
        403: t.Object({ error: t.String(), status: t.Optional(t.String()) }),
      },
      detail: {
        summary: "Log in (employee, partner or admin)",
        tags: ["auth"],
      },
    }
  )
  .post("/logout", ({ cookie, set }) => {
      clearSession(cookie);
      set.status = 200;
      return { success: true as const };
    },
    {
      response: { 200: t.Object({ success: t.Literal(true) }) },
      detail: { summary: "Clear the session cookie", tags: ["auth"] },
    }
  );

export { authRoutes, AUTH_COOKIE };
