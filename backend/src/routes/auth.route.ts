import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { database } from "../config/database";
import { employees, partners, adminAgents } from "../../db/drizzle/schema";
import { authPlugin, AUTH_COOKIE, issueSession, clearSession, verifyPassword, requireRole } from "../middleware/auth";

const roleEnum = t.Union([t.Literal("employee"), t.Literal("partner"), t.Literal("admin")]);
const employeeStatusEnum = t.Union([t.Literal("active"), t.Literal("inactive")]);
const partnerStatusEnum = t.Union([t.Literal("pending"), t.Literal("validated"), t.Literal("rejected"), t.Literal("archived")]);

const errorSchema = t.Object({ error: t.String() });

const meResponseSchema = t.Union([
  t.Object({
    role: t.Literal("employee"),
    employee: t.Object({
      id: t.String(),
      firstName: t.String(),
      lastName: t.String(),
      email: t.String(),
      status: employeeStatusEnum,
    }),
  }),
  t.Object({
    role: t.Literal("partner"),
    partner: t.Object({
      id: t.String(),
      name: t.Union([t.String(), t.Null()]),
      siren: t.Union([t.String(), t.Null()]),
      objetSocial: t.Union([t.String(), t.Null()]),
      address: t.Union([t.String(), t.Null()]),
      email: t.Union([t.String(), t.Null()]),
      status: partnerStatusEnum,
    }),
  }),
  t.Object({
    role: t.Literal("admin"),
    admin: t.Object({
      id: t.String(),
      email: t.String(),
    }),
  }),
]);

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

      if (!account || !account.passwordHash || !(await verifyPassword(password, account.passwordHash))) {
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
        401: errorSchema,
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
  )
  .get("/me", async ({ authUser, set }) => {
      const user = authUser!;

      if (user.role === "employee") {
        const [row] = await database
          .select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            status: employees.status,
          })
          .from(employees)
          .where(eq(employees.id, user.id))
          .limit(1);

        if (!row) {
          set.status = 404;
          return { error: "not_found" };
        }
        return { role: "employee" as const, employee: { ...row, id: String(row.id) } };
      }

      if (user.role === "partner") {
        const [row] = await database
          .select({
            id: partners.id,
            name: partners.name,
            siren: partners.siren,
            objetSocial: partners.objetSocial,
            address: partners.address,
            email: partners.email,
            status: partners.status,
          })
          .from(partners)
          .where(eq(partners.id, user.id))
          .limit(1);

        if (!row) {
          set.status = 404;
          return { error: "not_found" };
        }
        return { role: "partner" as const, partner: { ...row, id: String(row.id) } };
      }

      const [row] = await database
        .select({ id: adminAgents.id, email: adminAgents.email })
        .from(adminAgents)
        .where(eq(adminAgents.id, user.id))
        .limit(1);

      if (!row) {
        set.status = 404;
        return { error: "not_found" };
      }
      return { role: "admin" as const, admin: { id: String(row.id), email: row.email } };
    },
    {
      beforeHandle: requireRole("employee", "partner", "admin"),
      response: {
        200: meResponseSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get the currently authenticated user",
        description: "Reads the session cookie and returns the logged-in employee/partner/admin.",
        tags: ["auth"],
      },
    }
  );

export { authRoutes, AUTH_COOKIE };
