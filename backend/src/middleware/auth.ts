import { Elysia, t } from "elysia";
import { jwt } from "@elysia/jwt";
import { JWT_ACCESS_SECRET } from "../config/env";

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

export const authPlugin = new Elysia({ name: "auth" }).use(
  jwt({
    name: "jwt",
    secret: JWT_ACCESS_SECRET,
    alg: "HS256",
    exp: "12h",
    schema: jwtSchema,
  })
);

export async function authenticate(
  jwt: {
    verify: (token: string) => Promise<any>;
  },
  authorization: string | undefined
): Promise<AuthUser | null> {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  try {
    const payload = await jwt.verify(token);

    if (!payload || typeof payload.sub !== "string" ||
      (payload.role !== "employee" && payload.role !== "partner" && payload.role !== "admin")) {
      return null;
    }

    const id = Number(payload.sub);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return null;
    }

    return {
      id,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const requireRole = (role: UserRole) =>
  async ({ jwt, headers, set }: any) => {
    const user = await authenticate(jwt, headers.authorization);

    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    if (user.role !== role) {
      set.status = 403;
    return { error: "forbidden" };
  }
  return { user };
};

export const requireAdmin = requireRole("admin");
export const requireEmployee = requireRole("employee");
export const requirePartner = requireRole("partner");

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}
