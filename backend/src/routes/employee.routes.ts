import { Elysia, t } from "elysia";
import { desc, eq } from "drizzle-orm";
import { openapi } from "@elysia/openapi";
import { database } from "../config/database";
import { authPlugin, requireEmployee, verifyPassword, hashPassword, } from "../middleware/auth";
import { employees, employeeBalances, transactions, } from "../../db/drizzle/schema";

export const employeeRoutes = new Elysia({ prefix: "/api/employee" })
  .use(authPlugin)
  .use(openapi())
  .get('/qrcode', 'QR Code generation, in progress')
  .post("/login", async ({ body, jwt, set }) => {
    const [employee] = await database
      .select({
        id: employees.id,
        passwordHash: employees.passwordHash,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.email, body.email))
      .limit(1);

    if (!employee || !(await verifyPassword(body.password, employee.passwordHash))) {
      set.status = 401;
      return { error: "invalid_credentials" };
    }
    if (employee.status !== "active") {
      set.status = 403;
      return { error: "account_inactive" };
    }

    const token = await jwt.sign({
      sub: String(employee.id),
      role: "employee",
    });

      return { token };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  .post("/register", async ({ body, set }) => {
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
            id: employees.id  ,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            status: employees.status,
            createdAt: employees.createdAt,
          });
        set.status = 201;

        return {
          employee: {
            ...employee,
            id: String(employee.id),
          },
        };
      } catch (error: any) {
        const code = error?.cause?.errno;

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
    }
  )

  .get("/balance", async ({ user, set }) => {
    const [row] = await database
      .select({
        employeeId: employeeBalances.employeeId,
        balance: employeeBalances.balance,
      })
      .from(employeeBalances)
      .where(eq(employeeBalances.employeeId, user.id))
      .limit(1);

    if (!row) {
      set.status = 404;
      return { error: "employee_not_found" };
    }

      return {
        balance: row.balance,
      };
    },
    {
      beforeHandle: requireEmployee,
    }
  )

  .get("/transactions", async ({ user }) => {
    const result = await database
      .select({
        id: transactions.id,
        partnerId: transactions.partnerId,
        qrCodeId: transactions.qrCodeId,
        amount: transactions.amount,
        idempotencyKey: transactions.idempotencyKey,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.employeeId, user.id))
      .orderBy(desc(transactions.createdAt));

      return {
        transactions: result,
      };
    },
    {
      beforeHandle: requireEmployee,
    }
  );
