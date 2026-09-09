

import { describe, test, expect } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { database } from "../src/config/database";
import { employees, partners, creditGrants, qrCodes, transactions } from "../db/drizzle/schema";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createEmployee() {
  const [employee] = await database
    .insert(employees)
    .values({
      firstName: "Test",
      lastName: "Employee",
      email: `employee-${unique()}@test.local`,
      passwordHash: "test-hash",
    })
    .returning({ id: employees.id });
  return employee.id;
}

async function createValidatedPartner() {
  const suffix = unique();
  const siren = String(100000000 + Math.floor(Math.random() * 899999999));
  const [partner] = await database
    .insert(partners)
    .values({
      firstName: "Test",
      lastName: "Partner",
      siren,
      objetSocial: "Test",
      name: `Partner ${suffix}`,
      address: "1 rue de test",
      email: `partner-${suffix}@test.local`,
      phone: "0600000000",
      passwordHash: "test-hash",
      status: "validated",
    })
    .returning({ id: partners.id });
  return partner.id;
}

async function grantCredit(employeeId: number, amountCents: number) {
  await database.insert(creditGrants).values({ employeeId, amountCents });
}

async function createQrCode(employeeId: number) {
  const [qr] = await database
    .insert(qrCodes)
    .values({
      employeeId,
      token: `qr-${unique()}`,
      expiresAt: sql`now() + interval '4 minutes'`,
    })
    .returning({ id: qrCodes.id });
  return qr.id;
}

async function processPayment(
  partnerId: number,
  employeeId: number,
  qrCodeId: number,
  amountCents: number,
  idempotencyKey: string
) {
  const result: any = await database.execute(
    sql`select * from process_payment(${partnerId}, ${employeeId}, ${qrCodeId}, ${amountCents}, ${idempotencyKey})`
  );
  const row = Array.isArray(result) ? result[0] : result.rows?.[0];
  return row as { transaction_id: number | null; status: string };
}

describe("Regle 1: une transaction validee est immuable", () => {
  test("UPDATE et DELETE sur transactions sont rejetes", async () => {
    const employeeId = await createEmployee();
    const partnerId = await createValidatedPartner();
    await grantCredit(employeeId, 5000);
    const qrCodeId = await createQrCode(employeeId);

    const outcome = await processPayment(partnerId, employeeId, qrCodeId, 1000, `idem-${unique()}`);
    expect(outcome.status).toBe("approved");
    expect(outcome.transaction_id).not.toBeNull();

    const transactionId = outcome.transaction_id!;

    let updateError: any;
    try {
      await database.update(transactions).set({ amountCents: 999999 }).where(eq(transactions.id, transactionId));
    } catch (error) {
      updateError = error;
    }
    expect(String((updateError as any)?.cause?.message)).toMatch(/immutable/i);

    let deleteError: any;
    try {
      await database.delete(transactions).where(eq(transactions.id, transactionId));
    } catch (error) {
      deleteError = error;
    }
    expect(String((deleteError as any)?.cause?.message)).toMatch(/immutable/i);
  });
});

describe("Regle 2: le solde ne peut jamais devenir negatif", () => {
  test("un debit superieur au solde disponible est refuse sans ecriture", async () => {
    const employeeId = await createEmployee();
    const partnerId = await createValidatedPartner();
    await grantCredit(employeeId, 1000);
    const qrCodeId = await createQrCode(employeeId);

    const outcome = await processPayment(partnerId, employeeId, qrCodeId, 5000, `idem-${unique()}`);

    expect(outcome.status).toBe("refused_insufficient_balance");
    expect(outcome.transaction_id).toBeNull();

    const balanceResult: any = await database.execute(
      sql`select balance_cents from employee_balances where employee_id = ${employeeId}`
    );
    const balanceRow = Array.isArray(balanceResult) ? balanceResult[0] : balanceResult.rows?.[0];
    expect(Number(balanceRow.balance_cents)).toBe(1000);
  });
});

describe("Regle 3: idempotence, un rejeu ne debite pas deux fois", () => {
  test("le meme idempotency key renvoie la meme transaction sans nouvelle ecriture", async () => {
    const employeeId = await createEmployee();
    const partnerId = await createValidatedPartner();
    await grantCredit(employeeId, 5000);
    const qrCodeId = await createQrCode(employeeId);
    const idempotencyKey = `idem-${unique()}`;

    const first = await processPayment(partnerId, employeeId, qrCodeId, 1000, idempotencyKey);
    expect(first.status).toBe("approved");
    expect(first.transaction_id).not.toBeNull();

    const replay = await processPayment(partnerId, employeeId, qrCodeId, 1000, idempotencyKey);
    expect(replay.status).toBe("approved");
    expect(replay.transaction_id).toBe(first.transaction_id);

    const countResult: any = await database.execute(
      sql`select count(*)::int as count from transactions where partner_id = ${partnerId} and idempotency_key = ${idempotencyKey}`
    );
    const countRow = Array.isArray(countResult) ? countResult[0] : (countResult as any)?.rows?.[0];
    expect(Number(countRow.count)).toBe(1);
  });
});
