import { Elysia, t } from "elysia";
import { and, asc, desc, eq, gte, lte, count } from "drizzle-orm";
import crypto from "node:crypto";
import { database } from "../config/database";
import { auditLog } from "../../db/drizzle/schema";
import { authPlugin, requireAdmin } from "../middleware/auth";
import { AUDIT_EXPORT_HMAC_KEY } from "../config/env";

const errorSchema = t.Object({ error: t.String() });

function canonicalize(value: unknown): string {
  const sort = (values: any): any => {
    if (Array.isArray(values))
      return values.map(sort);
    if (values && typeof values === "object") {
      return Object.keys(values)
        .sort()
        .reduce((acc, k) => {
          acc[k] = sort(values[k]);
          return acc;
        }, {} as Record<string, unknown>);
    }
    return values;
  };
  return JSON.stringify(sort(value));
}

function serializeRow(r: typeof auditLog.$inferSelect) {
  return {
    id: String(r.id),
    occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : r.occurredAt,
    actorId: r.actorId !== null ? String(r.actorId) : null,
    actorRole: r.actorRole,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    payload: r.payload,
    ip: r.ip,
    prevHash: r.prevHash,
    recordHash: r.recordHash,
  };
}

export const auditRoutes = new Elysia({ prefix: "/api/v1/admin/audit" })
  .use(authPlugin)
  .get("/", async ({ query }) => {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? 50, 200);

      const conditions = [];
      if (query.from)
        conditions.push(gte(auditLog.occurredAt, new Date(query.from)));
      if (query.to)
        conditions.push(lte(auditLog.occurredAt, new Date(query.to)));
      if (query.actorId)
        conditions.push(eq(auditLog.actorId, Number(query.actorId)));
      if (query.action)
        conditions.push(eq(auditLog.action, query.action));
      const where = conditions.length ? and(...conditions) : undefined;

      const [[{ total }], rows] = await Promise.all([
        database.select({ total: count() }).from(auditLog).where(where),
        database
          .select()
          .from(auditLog)
          .where(where)
          .orderBy(desc(auditLog.id))
          .limit(limit)
          .offset((page - 1) * limit),
      ]);

      return {
        page,
        limit,
        total: Number(total),
        records: rows.map(serializeRow),
      };
    },
    {
      beforeHandle: requireAdmin,
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        actorId: t.Optional(t.String()),
        action: t.Optional(t.String()),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
      }),
      response: {
        200: t.Object({
          page: t.Integer(),
          limit: t.Integer(),
          total: t.Integer(),
          records: t.Array(
            t.Object({
              id: t.String(),
              occurredAt: t.String(),
              actorId: t.Union([t.String(), t.Null()]),
              actorRole: t.String(),
              action: t.String(),
              targetType: t.Union([t.String(), t.Null()]),
              targetId: t.Union([t.String(), t.Null()]),
              payload: t.Any(),
              ip: t.Union([t.String(), t.Null()]),
              prevHash: t.String(),
              recordHash: t.String(),
            })
          ),
        }),
        401: errorSchema,
        403: errorSchema,
      },
      detail: {
        summary: "List audit log entries (filterable by date, actor, action; paginated)",
        tags: ["admin", "audit"],
      },
    }
  )
  .get("/export", async ({ query, set }) => {
      const conditions = [];
      if (query.from)
        conditions.push(gte(auditLog.occurredAt, new Date(query.from)));
      if (query.to)
        conditions.push(lte(auditLog.occurredAt, new Date(query.to)));
      const where = conditions.length ? and(...conditions) : undefined;

      const rows = await database.select().from(auditLog).where(where).orderBy(asc(auditLog.id));

      if (rows.length === 0) {
        set.status = 404;
        return { error: "no_records_in_range" };
      }

      const records = rows.map(serializeRow);

      const meta = {
        generatedAt: new Date().toISOString(),
        from: query.from ?? null,
        to: query.to ?? null,
        count: records.length,
        chainHeadHash: records[0].prevHash,
        chainTailHash: records[records.length - 1].recordHash,
      };

      const secret = AUDIT_EXPORT_HMAC_KEY;
      const signature = crypto
        .createHmac("sha256", secret)
        .update(canonicalize({ meta, records }))
        .digest("hex");

      set.headers["content-type"] = "application/json";
      set.headers["content-disposition"] = `attachment; filename="audit-export-${Date.now()}.json"`;

      return { meta, records, signature };
    },
    {
      beforeHandle: requireAdmin,
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      detail: {
        summary: "HMAC-SHA256-signed export of the audit log for a period, verifiable offline",
        tags: ["admin", "audit"],
      },
    }
  );
