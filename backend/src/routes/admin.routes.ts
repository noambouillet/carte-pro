import { Elysia, t } from "elysia";
import { count, eq, sql } from "drizzle-orm";
import { employees, partners, partnerValidationDecisions, creditGrants, transactions } from "../../db/drizzle/schema";
import { database } from "../config/database";
import { authPlugin, requireAdmin } from "../middleware/auth";
import { fetchTransactionHistoryCsv } from "../scripts/export";

const partnerStatusEnum = t.Union([t.Literal("pending"), t.Literal("validated"), t.Literal("rejected"), t.Literal("archived")]);
const employeeStatusEnum = t.Union([t.Literal("active"), t.Literal("inactive")]);
const accountStatusEnum = t.Union([t.Literal("active"), t.Literal("suspended"), t.Literal("closed")]);
const accountTypeEnum = t.Union([t.Literal("employee"), t.Literal("partner")]);
const errorSchema = t.Object({ error: t.String() });

export const adminRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(authPlugin)
  .get("/accounts", async () => {
      const [employeeRows, partnerRows] = await Promise.all([
        database
          .select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            status: employees.status,
            createdAt: employees.createdAt,
          })
          .from(employees),
        database
          .select({
            id: partners.id,
            name: partners.name,
            email: partners.email,
            region: partners.region,
            status: partners.status,
            createdAt: partners.createdAt,
          })
          .from(partners),
      ]);

      return {
        employees: employeeRows.map((e) => ({ ...e, id: String(e.id) })),
        partners: partnerRows.map((p) => ({ ...p, id: String(p.id) })),
      };
    },
    {
      beforeHandle: requireAdmin,
      response: {
        200: t.Object({
          employees: t.Array(
            t.Object({
              id: t.String(),
              firstName: t.String(),
              lastName: t.String(),
              email: t.String(),
              status: employeeStatusEnum,
              createdAt: t.String(),
            })
          ),
          partners: t.Array(
            t.Object({
              id: t.String(),
              name: t.Union([t.String(), t.Null()]),
              email: t.Union([t.String(), t.Null()]),
              region: t.Optional(t.Union([t.String(), t.Null()])),
              status: partnerStatusEnum,
              createdAt: t.String(),
            })
          ),
        }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "List all employee and partner accounts",
        tags: ["admin"],
      },
    }
  )
  .patch("/accounts/:id/status", async ({ params, body, set }) => {
      const accountId = Number(params.id);
      const { type, status } = body;

      let updatedId: number | undefined;

      if (type === "partner") {
        const mappedPartnerStatus = status === "active" ? "validated" : "rejected";
        const [row] = await database
          .update(partners)
          .set({ status: mappedPartnerStatus })
          .where(eq(partners.id, accountId))
          .returning({ id: partners.id });
        updatedId = row?.id;
      } else {
        const mappedEmployeeStatus = status === "active" ? "active" : "inactive";
        const [row] = await database
          .update(employees)
          .set({ status: mappedEmployeeStatus })
          .where(eq(employees.id, accountId))
          .returning({ id: employees.id });
        updatedId = row?.id;
      }

      if (!updatedId) {
        set.status = 404;
        return { error: "account_not_found" };
      }

      return { account: { id: String(updatedId), type, status } };
    },
    {
      beforeHandle: requireAdmin,
      body: t.Object({
        type: accountTypeEnum,
        status: accountStatusEnum,
      }),
      response: {
        200: t.Object({
          account: t.Object({
            id: t.String(),
            type: accountTypeEnum,
            status: accountStatusEnum,
          }),
        }),
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Update account status for employee or partner",
        tags: ["admin"],
      },
    }
  )
  .get("/scoreboard", async () => {
      const [[employeeStats], [partnerStats], [txStats], [grantStats]] = await Promise.all([
        database
          .select({
            total: count(),
            active: sql<number>`count(*) filter (where ${employees.status} = 'active')`,
          })
          .from(employees),
        database
          .select({
            total: count(),
            validated: sql<number>`count(*) filter (where ${partners.status} = 'validated')`,
            pending: sql<number>`count(*) filter (where ${partners.status} = 'pending')`,
            rejected: sql<number>`count(*) filter (where ${partners.status} = 'rejected')`,
          })
          .from(partners),
        database
          .select({
            totalTransactions: count(),
            totalAmountCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
          })
          .from(transactions),
        database
          .select({
            totalGrantedCents: sql<number>`coalesce(sum(${creditGrants.amountCents}), 0)`,
          })
          .from(creditGrants),
      ]);

      return {
        employees: employeeStats,
        partners: partnerStats,
        transactions: txStats,
        creditGrants: grantStats,
      };
    },
    {
      beforeHandle: requireAdmin,
      response: {
        200: t.Object({
          employees: t.Object({ total: t.Integer(), active: t.Integer() }),
          partners: t.Object({
            total: t.Integer(),
            validated: t.Integer(),
            pending: t.Integer(),
            rejected: t.Integer(),
          }),
          transactions: t.Object({ totalTransactions: t.Integer(), totalAmountCents: t.Integer() }),
          creditGrants: t.Object({ totalGrantedCents: t.Integer() }),
        }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "National dashboard aggregates",
        tags: ["admin"],
      },
    }
  )
  .post("/partners/:id/validate", async ({ params, body, authUser, set }) => {
      const partnerId = Number(params.id);

      const updated = await database.transaction(async (tx) => {
        await tx.insert(partnerValidationDecisions).values({
          partnerId,
          agentId: authUser!.id,
          decision: body.decision,
          reason: body.reason,
        });

        const [row] = await tx
          .update(partners)
          .set({ status: body.decision === "approved" ? "validated" : "rejected" })
          .where(eq(partners.id, partnerId))
          .returning({ id: partners.id, status: partners.status });

        return row;
      });

      if (!updated) {
        set.status = 404;
        return { error: "partner_not_found" };
      }

      return { partner: { id: String(updated.id), status: updated.status } };
    },
    {
      beforeHandle: requireAdmin,
      body: t.Object({
        decision: t.Union([t.Literal("approved"), t.Literal("rejected")]),
        reason: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object({ partner: t.Object({ id: t.String(), status: partnerStatusEnum }) }),
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Validate or reject a partner",
        tags: ["admin"],
      },
    }
  )
  .post("/credit-grants", async ({ body, set }) => {
      const [grant] = await database
        .insert(creditGrants)
        .values({ employeeId: body.employeeId, amountCents: body.amountCents })
        .returning();

      set.status = 201;
      return {
        grant: {
          id: String(grant.id),
          employeeId: String(grant.employeeId),
          amountCents: grant.amountCents,
          grantedAt: grant.grantedAt,
        },
      };
    },
    {
      beforeHandle: requireAdmin,
      body: t.Object({
        employeeId: t.Integer({ minimum: 1 }),
        amountCents: t.Integer({ minimum: 1 }),
      }),
      response: {
        201: t.Object({
          grant: t.Object({
            id: t.String(),
            employeeId: t.String(),
            amountCents: t.Integer(),
            grantedAt: t.String(),
          }),
        }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "Grant credit to an employee",
        tags: ["admin"],
      },
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
      detail: {
        summary: "Export the full transaction history as CSV",
        tags: ["admin"],
      },
    }
  );