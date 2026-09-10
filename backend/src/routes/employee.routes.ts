import { Elysia, t } from "elysia";
import { and, desc, eq, gte } from "drizzle-orm";
import { database } from "../config/database";
import { authPlugin, requireActiveEmployee, requireAdmin, hashPassword, clearSession } from "../middleware/auth";
import { qrJwtPlugin } from "../middleware/qr";
import { recordAudit, clientIp } from "../middleware/audit";
import { employees, employeeBalances, transactionHistory, qrCodes, partners } from "../../db/drizzle/schema";

const employeeStatusEnum = t.Union([t.Literal("active"), t.Literal("inactive")]);
const errorSchema = t.Object({ error: t.String() });

export const employeeRoutes = new Elysia({ prefix: "/api/v1/employees" })
  .use(authPlugin)
  .use(qrJwtPlugin)
  .post("/register", async ({ body, request, set }) => {
      const passwordHash = await hashPassword(body.password);

      try {
        const [employee] = await database
          .insert(employees)
          .values({
            firstName: body.first_name,
            lastName: body.last_name,
            email: body.email,
            passwordHash,
          })
          .returning({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            status: employees.status,
            createdAt: employees.createdAt,
          });

        await recordAudit(database, {
          actorId: null,
          actorRole: "anonymous",
          action: "employee.created",
          targetType: "employee",
          targetId: employee.id,
          payload: { email: employee.email },
          ip: clientIp(request),
        });
        set.status = 201;
        return { employee: { ...employee, id: String(employee.id) } };
      } catch (error: any) {

        const code = error?.code ?? error?.cause?.errno;
        if (code === "23505") {
          set.status = 409;
          return {
            error: "email_already_registered",
            message: "An employee with this email already exists.",
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        first_name: t.String({ minLength: 1 }),
        last_name: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8 }),
      }),
      response: {
        201: t.Object({
          employee: t.Object({
            id: t.String(),
            firstName: t.String(),
            lastName: t.String(),
            email: t.String(),
            status: employeeStatusEnum,
            createdAt: t.String(),
          }),
        }),
        409: t.Object({ error: t.String(), message: t.String() }),
      },
      detail: { summary: "Register a new employee", tags: ["employee"] },
    }
  )
  .get("/balance", async ({ authUser, set }) => {
      const [row] = await database
        .select({ balance: employeeBalances.balanceCents })
        .from(employeeBalances)
        .where(eq(employeeBalances.employeeId, authUser!.id))
        .limit(1);

      if (!row) {
        set.status = 404;
        return { error: "employee_not_found" };
      }

      return { balanceCents: Number(row.balance) };
    },
    {
      beforeHandle: requireActiveEmployee,
      response: {
        200: t.Object({ balanceCents: t.Integer() }),
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Real-time balance",
        tags: ["employee"],
      },
    }
  )
  .get("/transactions", async ({ authUser, query }) => {
    const since = query.since ? new Date(query.since).toISOString() : undefined;

      const result = await database
        .select({
          id: transactionHistory.id,
          occurredAt: transactionHistory.occurredAt,
          partnerId: transactionHistory.partnerId,
          partnerName: partners.name,
          partnerRegion: partners.region,
          qrCodeId: transactionHistory.qrCodeId,
          amountCents: transactionHistory.amountCents,
          status: transactionHistory.status,
        })
        .from(transactionHistory)
        .leftJoin(
          partners,
          eq(partners.id, transactionHistory.partnerId),
        )
        .where(
          and(
            eq(transactionHistory.employeeId, authUser!.id),
            since ? gte(transactionHistory.occurredAt, since) : undefined
          )
        )
        .orderBy(
          desc(transactionHistory.occurredAt),
        )
        .limit(1000);

      return {
        transactions: result.map((row) => ({
          id: String(row.id),
          occurredAt: row.occurredAt,
          partnerId: row.partnerId !== null ? String(row.partnerId) : null,
          partnerName: row.partnerName,
          partnerRegion: row.partnerRegion,
          qrCodeId: row.qrCodeId !== null ? String(row.qrCodeId) : null,
          amountCents: Number(row.amountCents),
          status: row.status,
        })),
      };
    },
    {
      beforeHandle: requireActiveEmployee,
      response: {
        200: t.Object({
          transactions: t.Array(
            t.Object({
              id: t.String(),
              occurredAt: t.String(),
              partnerId: t.Union([
                t.String(),
                t.Null(),
              ]),
              partnerName: t.Union([
                t.String(),
                t.Null(),
              ]),
              partnerRegion: t.Union([
                t.String(),
                t.Null(),
              ]),
              qrCodeId: t.Union([
                t.String(),
                t.Null(),
              ]),
              amountCents: t.Integer(),
              status: t.String(),
            }),
          ),
        }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "Transaction history for the logged-in employee",
        tags: ["employee"],
      },
    },
  )
  .post("/qrcode", async ({ authUser, qrJwt, set }) => {
      const jti = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await database.insert(qrCodes).values({
        employeeId: authUser!.id,
        token: jti,
        expiresAt: expiresAt.toISOString(),
      });

      const token = await qrJwt.sign({ employeeId: String(authUser!.id), jti });

      set.status = 201;
      return { token, expiresAt: expiresAt.toISOString() };
    },
    {
      beforeHandle: requireActiveEmployee,
      response: {
        201: t.Object({ token: t.String(), expiresAt: t.String() }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "Generate a single-use payment QR code",
        tags: ["employee"],
      },
    }
  )
  .delete("/me", async ({ authUser, cookie, set, request }) => {
    const [employee] = await database
      .update(employees)
      .set({
        status: "inactive",
      })
      .where(eq(employees.id, authUser!.id))
      .returning({
        id: employees.id,
        status: employees.status,
      });

    if (!employee) {
      set.status = 404;
      return { error: "employee_not_found" };
    }

    await recordAudit(database, {
      actorId: authUser!.id,
      actorRole: "employee",
      action: "employee.deactivated",
      targetType: "employee",
      targetId: employee.id,
      payload: {
        status: employee.status,
      },
      ip: clientIp(request),
    });
    clearSession(cookie);

    return {
      success: true as const,
    };
  },
  {
    beforeHandle: requireActiveEmployee,
    response: {
      200: t.Object({
        success: t.Literal(true),
      }),
      401: errorSchema,
      403: errorSchema,
      404: errorSchema,
    },
    detail: {
      summary: "Deactivate the currently authenticated employee",
      description: "Soft-deletes the employee by setting their status to inactive.",
      tags: ["employee"],
    },
  })
  .get("/:id/balance", async ({ params, set }) => {
      const employeeId = Number(params.id);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        set.status = 400;
        return { error: "invalid_employee_id" };
      }

      const [row] = await database
        .select({
          balance: employeeBalances.balanceCents,
        })
        .from(employeeBalances)
        .where(eq(employeeBalances.employeeId, employeeId))
        .limit(1);

      if (!row) {
        set.status = 404;
        return { error: "employee_not_found" };
      }

      return {
        employeeId: String(employeeId),
        balanceCents: Number(row.balance),
      };
    },
    {
      beforeHandle: requireAdmin,

      params: t.Object({
        id: t.String({ pattern: "^[0-9]+$" }),
      }),

      response: {
        200: t.Object({
          employeeId: t.String(),
          balanceCents: t.Integer(),
        }),
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
      },

      detail: {
        summary: "Get employee balance",
        description: "SIRH integration endpoint for retrieving an employee's balance.",
        tags: ["SIRH"],
      },
    },
  )  ;
