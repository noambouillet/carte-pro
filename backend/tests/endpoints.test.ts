import { describe, test, expect } from "bun:test";
import { Elysia } from "elysia";
import { authRoutes } from "../src/routes/auth.route";
import { employeeRoutes } from "../src/routes/employee.routes";
import { partnersRoutes } from "../src/routes/partners.routes";
import { adminRoutes } from "../src/routes/admin.routes";
import { database } from "../src/config/database";
import { employees, creditGrants, partners, adminAgents } from "../db/drizzle/schema";
import { hashPassword } from "../src/middleware/auth";

const app = new Elysia().use(authRoutes).use(employeeRoutes).use(partnersRoutes).use(adminRoutes);

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const PASSWORD = "CorrectPassword1!";

async function createEmployee() {
  const passwordHash = await hashPassword(PASSWORD);
  const [employee] = await database
    .insert(employees)
    .values({
      firstName: "Test",
      lastName: "Employee",
      email: `employee-${unique()}@test.local`,
      passwordHash,
    })
    .returning({ id: employees.id, email: employees.email });
  return employee;
}

async function createValidatedPartner() {
  const passwordHash = await hashPassword(PASSWORD);
  const siren = String(100000000 + Math.floor(Math.random() * 899999999));
  const [partner] = await database
    .insert(partners)
    .values({
      firstName: "Test",
      lastName: "Partner",
      siren,
      objetSocial: "Test",
      name: "Partner Test",
      region: "Test",
      email: `partner-${unique()}@test.local`,
      phone: "0600000000",
      passwordHash,
      status: "validated",
    })
    .returning({ id: partners.id, email: partners.email });
  return partner;
}

async function createAdmin() {
  const passwordHash = await hashPassword(PASSWORD);
  const [admin] = await database
    .insert(adminAgents)
    .values({
      firstName: "Test",
      lastName: "Admin",
      email: `admin-${unique()}@test.local`,
      passwordHash,
    })
    .returning({ id: adminAgents.id, email: adminAgents.email });
  return admin;
}

function extractCookie(response: Response): string {
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

async function post(path: string, body?: unknown, cookie?: string) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );
}

async function get(path: string, cookie?: string) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
    })
  );
}

describe("POST /api/v1/auth/login", () => {
  test("mauvais mot de passe -> 401", async () => {
    const employee = await createEmployee();
    const res = await post("/api/v1/auth/login", { email: employee.email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("invalid_credentials");
  });

  test("bons identifiants -> 200 avec le role", async () => {
    const employee = await createEmployee();
    const res = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe("employee");
  });
});

describe("GET /api/v1/employees/balance", () => {
  test("sans session -> 401", async () => {
    const res = await get("/api/v1/employees/balance");
    expect(res.status).toBe(401);
  });

  test("avec une session valide -> le vrai solde", async () => {
    const employee = await createEmployee();
    await database.insert(creditGrants).values({ employeeId: employee.id, amountCents: 2000 });

    const loginRes = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await get("/api/v1/employees/balance", cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).balanceCents).toBe(2000);
  });
});

describe("POST /api/v1/employees/qrcode", () => {
  test("avec une session valide -> un token", async () => {
    const employee = await createEmployee();
    const loginRes = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await post("/api/v1/employees/qrcode", undefined, cookie);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(typeof body.expiresAt).toBe("string");
  });
});

describe("GET /api/v1/partners/search", () => {
  test("route publique -> liste de partenaires", async () => {
    const res = await get("/api/v1/partners/search");
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).partners)).toBe(true);
  });
});

describe("POST /api/v1/employees/register", () => {
  test("email nouveau -> 201, compte cree en statut actif", async () => {
    const email = `employee-${unique()}@test.local`;
    const res = await post("/api/v1/employees/register", {
      first_name: "Nouveau",
      last_name: "Salarie",
      email,
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.employee.email).toBe(email);
    expect(body.employee.status).toBe("active");
  });

  test("email deja utilise -> 409", async () => {
    const employee = await createEmployee();
    const res = await post("/api/v1/employees/register", {
      first_name: "Doublon",
      last_name: "Salarie",
      email: employee.email,
      password: PASSWORD,
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("email_already_registered");
  });
});

describe("GET /api/v1/auth/me", () => {
  test("sans session -> 401", async () => {
    const res = await get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  test("avec une session valide -> le profil du salarie connecte", async () => {
    const employee = await createEmployee();
    const loginRes = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await get("/api/v1/auth/me", cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("employee");
    expect(body.employee.email).toBe(employee.email);
  });
});

describe("POST /api/v1/auth/logout", () => {
  test("efface la session, la route protegee redevient inaccessible", async () => {
    const employee = await createEmployee();
    const loginRes = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const logoutRes = await post("/api/v1/auth/logout", undefined, cookie);
    expect(logoutRes.status).toBe(200);
    expect((await logoutRes.json()).success).toBe(true);

    const clearedCookie = extractCookie(logoutRes);
    const meRes = await get("/api/v1/auth/me", clearedCookie);
    expect(meRes.status).toBe(401);
  });
});

describe("GET /api/v1/admin/accounts", () => {
  test("sans session -> 401", async () => {
    const res = await get("/api/v1/admin/accounts");
    expect(res.status).toBe(401);
  });

  test("avec une session salarie (mauvais role) -> 403", async () => {
    const employee = await createEmployee();
    const loginRes = await post("/api/v1/auth/login", { email: employee.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await get("/api/v1/admin/accounts", cookie);
    expect(res.status).toBe(403);
  });

  test("avec une session admin -> la liste des comptes salaries et partenaires", async () => {
    const admin = await createAdmin();
    const loginRes = await post("/api/v1/auth/login", { email: admin.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await get("/api/v1/admin/accounts", cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.employees)).toBe(true);
    expect(Array.isArray(body.partners)).toBe(true);
  });
});

describe("POST /api/v1/partners/register", () => {
  test("nouveau partenaire -> 201, statut en attente de validation", async () => {
    const siren = String(100000000 + Math.floor(Math.random() * 899999999));
    const res = await post("/api/v1/partners/register", {
      firstName: "Nouveau",
      lastName: "Partenaire",
      email: `partner-${unique()}@test.local`,
      password: PASSWORD,
      siren,
      socialPurpose: "Vente de test",
      establishmentName: "Commerce Test",
      establishmentRegion: "Ile-de-France",
      establishmentPhone: "0600000000",
    });
    expect(res.status).toBe(201);
    expect((await res.json()).partner.status).toBe("pending");
  });
});

describe("GET /api/v1/partners/transactions", () => {
  test("sans session -> 401", async () => {
    const res = await get("/api/v1/partners/transactions");
    expect(res.status).toBe(401);
  });

  test("avec un partenaire valide -> la liste de ses transactions", async () => {
    const partner = await createValidatedPartner();
    const loginRes = await post("/api/v1/auth/login", { email: partner.email, password: PASSWORD });
    const cookie = extractCookie(loginRes);

    const res = await get("/api/v1/partners/transactions", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).transactions)).toBe(true);
  });
});
