import { Elysia, t } from "elysia";
import { jwt } from "@elysia/jwt";
import { eq } from "drizzle-orm";
import { JWT_ACCESS_SECRET } from "../config/env";
import { database } from "../config/database";
import { employees, partners } from "../../db/drizzle/schema";

export type UserRole = "employee" | "partner" | "admin";

export interface AuthUser {
  id: number;
  role: UserRole;
}

const jwtSchema = t.Object({
  sub: t.String(),
  role: t.Union([
    t.Literal("employee"),
    t.Literal("partner"),
    t.Literal("admin"),
  ]),
});

export const AUTH_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 2;

export const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      name: "jwt",
      secret: JWT_ACCESS_SECRET,
      alg: "HS256",
      exp: "2h",
      schema: jwtSchema,
    })
  )
  .derive({ as: "scoped" }, async ({ jwt, cookie }) => {
    const raw = cookie[AUTH_COOKIE]?.value;

    if (typeof raw !== "string") {
      return { authUser: null as AuthUser | null };
    }

    const payload = await jwt.verify(raw).catch(() => null);
    if (
      !payload ||
      typeof payload.sub !== "string" ||
      (payload.role !== "employee" &&
        payload.role !== "partner" &&
        payload.role !== "admin")
    ) {
      return { authUser: null as AuthUser | null };
    }

    let id: number;

    try {
      id = Number(payload.sub);
    } catch {
      return { authUser: null as AuthUser | null };
    }
    if (id <= 0n) {
      return { authUser: null as AuthUser | null };
    }
    return { authUser: { id, role: payload.role } };
  });

export async function issueSession(
  jwtInstance: { sign: (payload: Record<string, unknown>) => Promise<string> },
  cookie: Record<string, any>,
  user: AuthUser,
  isProduction: boolean
) {
  const token = await jwtInstance.sign({ sub: String(user.id), role: user.role });
  cookie[AUTH_COOKIE].set({
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSession(cookie: Record<string, any>) {
  cookie[AUTH_COOKIE].remove();
}

export const requireRole =
  (...roles: UserRole[]) =>
  ({ authUser, set }: { authUser: AuthUser | null; set: any }) => {
    if (!authUser) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    if (!roles.includes(authUser.role)) {
      set.status = 403;
      return { error: "forbidden" };
    }
  };

export const requireAdmin = requireRole("admin");
export const requireEmployee = requireRole("employee");
export const requirePartner = requireRole("partner");

export const requireActiveEmployee = async ({
  authUser,
  set,
}: {
  authUser: AuthUser | null;
  set: any;
}) => {
  if (!authUser || authUser.role !== "employee") {
    set.status = authUser ? 403 : 401;
    return { error: authUser ? "forbidden" : "unauthorized" };
  }

  const [row] = await database
    .select({ status: employees.status })
    .from(employees)
    .where(eq(employees.id, authUser.id))
    .limit(1);

  if (!row || row.status !== "active") {
    set.status = 403;
    return { error: "account_inactive" };
  }
};

export const requireValidatedPartner = async ({
  authUser,
  set,
}: {
  authUser: AuthUser | null;
  set: any;
}) => {
  if (!authUser || authUser.role !== "partner") {
    set.status = authUser ? 403 : 401;
    return { error: authUser ? "forbidden" : "unauthorized" };
  }

  const [row] = await database
    .select({ status: partners.status })
    .from(partners)
    .where(eq(partners.id, authUser.id))
    .limit(1);

  if (!row || row.status !== "validated") {
    set.status = 403;
    return { error: "partner_not_validated", status: row?.status ?? "unknown" };
  }
};

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
