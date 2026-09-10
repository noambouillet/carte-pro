import { auditLog } from "../../db/drizzle/schema";
import { database } from "../config/database";

export type AuditActorRole = "employee" | "partner" | "admin" | "anonymous";

export interface AuditEvent {
  actorId: number | null;
  actorRole: AuditActorRole;
  action: string;
  targetType?: string;
  targetId?: string | number | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
}

type DbLike = { insert: typeof database.insert };

export async function recordAudit(db: DbLike, event: AuditEvent): Promise<void> {
  await db.insert(auditLog).values({
    actorId: event.actorId,
    actorRole: event.actorRole,
    action: event.action,
    targetType: event.targetType ?? null,
    targetId: event.targetId !== undefined && event.targetId !== null ? String(event.targetId) : null,
    payload: event.payload ?? null,
    ip: event.ip ?? null,
  });
}

export function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff)
    return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
