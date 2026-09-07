import { Elysia, t } from "elysia";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { database } from "../config/database";
import { partners, qrCodes, transactions } from "../../db/drizzle/schema";
import { authPlugin, requireValidatedPartner, hashPassword } from "../middleware/auth";
import { qrJwtPlugin } from "../middleware/qr";

const partnerStatusEnum = t.Union([t.Literal("pending"), t.Literal("validated"), t.Literal("rejected")]);
const errorSchema = t.Object({ error: t.String() });

export const partnersRoutes = new Elysia({ prefix: "/api/v1/partners" })
  .use(authPlugin)
  .use(qrJwtPlugin)
  .post("/register", async ({ body, set }) => {
      try {
        const passwordHash = await hashPassword(body.password);

        const [partner] = await database
          .insert(partners)
          .values({
            name: body.name,
            siren: body.siren,
            objetSocial: body.objetSocial,
            address: body.address,
            email: body.email,
            passwordHash,
          })
          .returning({
            id: partners.id,
            name: partners.name,
            siren: partners.siren,
            objetSocial: partners.objetSocial,
            address: partners.address,
            email: partners.email,
            status: partners.status,
            createdAt: partners.createdAt,
          });

        set.status = 201;
        return { partner: { ...partner, id: String(partner.id) } };
      } catch (error: any) {
        const code = error?.code ?? error?.cause?.errno;
        if (code === "23505") {
          set.status = 409;
          return { error: "email_already_registered", message: "A partner with this email already exists." };
        }
        if (code === "23514") {
          set.status = 400;
          return { error: "invalid_partner_data", message: "The provided partner data is invalid." };
        }
        console.error("Partner registration failed:", error);
        set.status = 500;
        return { error: "registration_failed", message: "Unable to register partner." };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        siren: t.String({ minLength: 9, maxLength: 9, pattern: "^\\d{9}$" }),
        objetSocial: t.String({ minLength: 1 }),
        address: t.String({ minLength: 1 }),
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 8 }),
      }),
      response: {
        201: t.Object({
          partner: t.Object({
            id: t.String(),
            name: t.String(),
            siren: t.String(),
            objetSocial: t.String(),
            address: t.String(),
            email: t.String(),
            status: partnerStatusEnum,
            createdAt: t.String(),
          }),
        }),
        400: t.Object({ error: t.String(), message: t.String() }),
        409: t.Object({ error: t.String(), message: t.String() }),
        500: t.Object({ error: t.String(), message: t.String() }),
      },
      detail: {
        summary: "Register a new partner",
        description: "New partners start in 'pending' status and cannot log in until an admin validates them.",
        tags: ["partners"],
      },
    }
  )
  .get("/search", async ({ query }) => {
      const term = `%${query.q ?? ""}%`;
      const result = await database
        .select({ id: partners.id, name: partners.name, address: partners.address, status: partners.status })
        .from(partners)
        .where(and(eq(partners.status, "validated"), or(ilike(partners.name, term), ilike(partners.address, term))))
        .orderBy(desc(partners.createdAt))
        .limit(20);

      return { partners: result.map((p) => ({ ...p, id: String(p.id) })) };
    },
    {
      query: t.Object({ q: t.Optional(t.String()) }),
      response: {
        200: t.Object({
          partners: t.Array(
            t.Object({ id: t.String(), name: t.String(), address: t.String(), status: partnerStatusEnum })
          ),
        }),
      },
      detail: {
        summary: "Search validated partners by name or address",
        tags: ["partners"],
      },
    }
  )
  .post("/transactions", async ({ body, authUser, qrJwt, set }) => {
      const payload = await qrJwt.verify(body.qrToken).catch(() => null);
      if (!payload) {
        set.status = 400;
        return { error: "invalid_qr_code" };
      }
      const employeeId = Number(payload.employeeId);
      const [qrRow] = await database
        .select({ id: qrCodes.id })
        .from(qrCodes)
        .where(and(eq(qrCodes.token, payload.jti), eq(qrCodes.employeeId, employeeId)))
        .limit(1);

      if (!qrRow) {
        set.status = 400;
        return { error: "qr_expired_or_used" };
      }

      let outcome: { transaction_id: number | null; status: string };
      try {
        const result: any = await database.execute(
          sql`select * from process_payment(${authUser!.id}, ${employeeId}, ${qrRow.id}, ${body.amountCents}, ${body.idempotencyKey})`
        );
        const row = Array.isArray(result) ? result[0] : result.rows?.[0];
        if (!row)
          throw new Error("process_payment returned no row");
        outcome = row;
      } catch (error: any) {
        const message = String(error?.message ?? "");
        if (message.includes("inactive") || message.includes("does not exist")) {
          set.status = 403;
          return { error: "account_inactive" };
        }
        if (message.includes("not validated")) {
          set.status = 403;
          return { error: "partner_not_validated" };
        }
        if (message.includes("invalid or expired QR")) {
          set.status = 400;
          return { error: "qr_expired_or_used" };
        }
        throw error;
      }

      if (outcome.status === "refused_insufficient_balance") {
        set.status = 402;
        return { error: "insufficient_balance" };
      }

      const [t2] = await database
        .select()
        .from(transactions)
        .where(eq(transactions.id, outcome.transaction_id!));

      set.status = 201;
      return {
        transaction: {
          id: String(t2.id),
          employeeId: String(t2.employeeId),
          partnerId: String(t2.partnerId),
          qrCodeId: t2.qrCodeId ? String(t2.qrCodeId) : null,
          amountCents: t2.amountCents,
          idempotencyKey: t2.idempotencyKey,
          createdAt: t2.createdAt,
        },
      };
    },
    {
      beforeHandle: requireValidatedPartner,
      body: t.Object({
        qrToken: t.String(),
        amountCents: t.Integer({ minimum: 1 }),
        idempotencyKey: t.String({ minLength: 1 }),
      }),
      response: {
        201: t.Object({
          transaction: t.Object({
            id: t.String(),
            employeeId: t.String(),
            partnerId: t.String(),
            qrCodeId: t.Union([t.String(), t.Null()]),
            amountCents: t.Integer(),
            idempotencyKey: t.String(),
            createdAt: t.String(),
          }),
        }),
        400: errorSchema,
        401: errorSchema,
        402: errorSchema,
        403: t.Object({ error: t.String(), status: t.Optional(t.String()) }),
      },
      detail: {
        summary: "Redeem a QR code to charge an employee",
        tags: ["partners"],
      },
    }
  );
