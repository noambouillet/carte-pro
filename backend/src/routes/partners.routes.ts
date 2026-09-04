import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { openapi } from "@elysia/openapi";
import { database } from "../config/database";
import { partners } from "../../db/drizzle/schema";
import { authPlugin, verifyPassword} from "../middleware/auth";

export const partnersRoutes = new Elysia({ prefix: "/api/partners" })
  .use(authPlugin)
  .use(openapi())
  .post("/register", "Register")
  .post("/search", "Search")
  .post("/login", async ({ body, jwt, set }) => {
      const [partner] = await database
        .select({
          id: partners.id,
          passwordHash: partners.passwordHash,
          status: partners.status,
        })
        .from(partners)
        .where(eq(partners.email, body.email))
        .limit(1);

      if (!partner || !(await verifyPassword(body.password, partner.passwordHash))) {
        set.status = 401;
        return {
          error: "invalid_credentials"
        };
      }
      if (partner.status !== "validated") {
        set.status = 403;

        return {
          error: "partner_not_validated",
          status: partner.status,
        };
      }

      const token = await jwt.sign({
        sub: String(partner.id),
        role: "partner",
      });

      return { token };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  );
