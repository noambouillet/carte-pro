import { asc, count, eq, sql } from "drizzle-orm";
import { database } from "../config/database";

import {
  adminAgents,
  creditGrants,
  employees,
  employeeBalances,
  partners,
  partnerValidationDecisions,
  qrCodes,
  transactionAttempts,
  transactions,
} from "../../db/drizzle/schema";

import { makeRng, pick, randInt, randAmount, hex, type Rng } from "./rng";
import { fetchTransactionHistoryCsv } from "./export";

import {
  REF_DATE,
  WINDOW_DAYS,
  SEED,
  FIRST_NAMES,
  LAST_NAMES,
  EMAIL_DOMAIN,
  PARTNERS,
  ADMIN_AGENTS,
  EMPLOYEE_COUNT,
  TRANSACTIONS_PER_EMPLOYEE,
  ZERO_BALANCE_EMPLOYEE_INDICES,
  LOW_BALANCE_EMPLOYEE_INDICES,
} from "./data";

const rng: Rng = makeRng(SEED);

const SEED_PASSWORD = "Recette2026!";

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function dateAtDay(day: number, hourRng: Rng): Date {
  const d = new Date(REF_DATE.getTime());

  d.setUTCDate(d.getUTCDate() + Math.min(day, WINDOW_DAYS - 1));
  d.setUTCHours(randInt(hourRng, 8, 19), randInt(hourRng, 0, 59), randInt(hourRng, 0, 59), 0);

  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function luhnSiren(): string {
  const digits: number[] = [];

  for (let i = 0; i < 8; i++) digits.push(randInt(rng, 0, 9));

  let sum = 0;

  for (let i = 0; i < 8; i++) {
    let d = digits[i];

    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }

    sum += d;
  }

  const check = (10 - (sum % 10)) % 10;

  return digits.join("") + check;
}

interface DebitAmounts {
  d1: number;
  d2: number;
  d3: number;
  d4: number;
}

interface EmployeePlan {
  index: number;
  firstName: string;
  lastName: string;
  email: string;

  days: {
    grant1: number;
    debit1: number;
    debit2: number;
    grant2: number;
    debit3: number;
    debit4: number;
    refusal?: number;
  };

  grantAmounts: {
    g1: number;
    g2: number;
  };

  debitAmounts: DebitAmounts;
  refusalAmount?: number;
  finalBalance: number;
}

function buildEmployeePlan(index: number): EmployeePlan {
  const isZero = ZERO_BALANCE_EMPLOYEE_INDICES.includes(index);
  const isLow = LOW_BALANCE_EMPLOYEE_INDICES.includes(index);
  const isRefused = isZero || isLow;

  const firstName = pick(rng, FIRST_NAMES);
  const lastName = pick(rng, LAST_NAMES);

  const dGrant1 = randInt(rng, 0, 4);
  const dDebit1 = dGrant1 + randInt(rng, 5, 10);
  const dDebit2 = dDebit1 + randInt(rng, 8, 15);
  const gapToGrant2 = randInt(rng, 5, 12);
  const dGrant2 = dDebit2 + gapToGrant2;
  const dDebit3 = dGrant2 + randInt(rng, 3, 10);
  const dDebit4 = dDebit3 + randInt(rng, 10, 20);

  const dRefusal = isRefused ? dDebit2 + randInt(rng, 1, Math.max(1, gapToGrant2 - 1)) : undefined;

  const g1 = randAmount(rng, 70, 150, 5);
  const g2 = randAmount(rng, 60, 130, 5);

  let balance = g1;

  const d1 = randAmount(rng, 5, Math.max(6, Math.min(balance * 0.35, 25)));
  balance = round2(balance - d1);

  const d2 = randAmount(rng, 5, Math.max(6, Math.min(balance * 0.5, 30)));
  balance = round2(balance - d2);

  const midBalance = balance;

  balance = round2(balance + g2);

  const d3 = randAmount(rng, 5, Math.max(6, Math.min(balance * 0.35, 35)));
  balance = round2(balance - d3);

  let d4: number;

  if (isZero) {
    d4 = balance;
  } else if (isLow) {
    const leaveBehind = randAmount(rng, 0.5, 4.5, 0.5);
    d4 = round2(balance - leaveBehind);
  } else {
    d4 = randAmount(rng, 5, Math.max(6, Math.min(balance * 0.6, 40)));
  }

  balance = round2(balance - d4);

  const refusalAmount = isRefused ? round2(midBalance + randAmount(rng, 5, 40)) : undefined;

  return {
    index,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@${EMAIL_DOMAIN}`,
    days: { grant1: dGrant1, debit1: dDebit1, debit2: dDebit2, grant2: dGrant2, debit3: dDebit3, debit4: dDebit4, refusal: dRefusal },
    grantAmounts: { g1, g2 },
    debitAmounts: { d1, d2, d3, d4 },
    refusalAmount,
    finalBalance: balance,
  };
}

async function main() {
  console.log(`Seeding with SEED="${SEED}", REF_DATE=${REF_DATE.toISOString()}`);
  console.log(`All seeded accounts share the password: ${SEED_PASSWORD}`);

  const passwordHash = await Bun.password.hash(SEED_PASSWORD, {
    algorithm: "bcrypt",
    cost: 10,
  });

  let refusalsLogged = 0;
  let reportEmployeeId = 0;

  const employeeIds: number[] = [];
  const plans: EmployeePlan[] = [];

  await database.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE
        transaction_attempts,
        transactions,
        qr_codes,
        credit_grants,
        partner_validation_decisions,
        partners,
        admin_agents,
        employees
      RESTART IDENTITY CASCADE
    `);

    await tx.execute(sql`
      ALTER SEQUENCE transaction_events_id_seq RESTART WITH 1
    `);

    const adminAgentIds: number[] = [];

    for (const a of ADMIN_AGENTS) {
      const [agent] = await tx
        .insert(adminAgents)
        .values({
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          passwordHash,
        })
        .returning({ id: adminAgents.id });

      if (!agent)
        throw new Error(`Failed to create admin agent ${a.email}`);

      adminAgentIds.push(Number(agent.id));
    }

    const partnerIds: number[] = [];

    for (const p of PARTNERS) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const email = `contact@${slug}.test`;

      const [partner] = await tx
        .insert(partners)
        .values({
          name: p.name,
          siren: luhnSiren(),
          objetSocial: p.objetSocial,
          address: "Adresse de test",
          email,
          passwordHash,
          status: "validated",
        })
        .returning({ id: partners.id });

      if (!partner)
        throw new Error(`Failed to create partner ${p.name}`);

      const partnerId = Number(partner.id);
      partnerIds.push(partnerId);

      const decidedAt = new Date(REF_DATE.getTime());
      decidedAt.setUTCDate(decidedAt.getUTCDate() - randInt(rng, 3, 12));

      await tx.insert(partnerValidationDecisions).values({
        partnerId,
        agentId: pick(rng, adminAgentIds),
        decision: "approved",
        reason: "Dossier complet, SIREN verifie, activite conforme au perimetre CartePro.",
        decidedAt: decidedAt.toISOString(),
      });
    }

    for (let i = 0; i < EMPLOYEE_COUNT; i++) {
      const plan = buildEmployeePlan(i);
      plans.push(plan);

      const [employee] = await tx
        .insert(employees)
        .values({
          firstName: plan.firstName,
          lastName: plan.lastName,
          email: plan.email,
          passwordHash,
          status: "active",
        })
        .returning({ id: employees.id });

      if (!employee)
        throw new Error(`Failed to create employee ${plan.email}`);

      employeeIds.push(Number(employee.id));
    }

    type Event = { kind: "grant"; employeeIdx: number; amount: number; at: Date }
      | { kind: "debit"; employeeIdx: number; amount: number; at: Date }
      | { kind: "refusal"; employeeIdx: number; amount: number; at: Date };

    const events: Event[] = [];

    for (const plan of plans) {
      events.push({ kind: "grant", employeeIdx: plan.index, amount: plan.grantAmounts.g1, at: dateAtDay(plan.days.grant1, rng) });
      events.push({ kind: "debit", employeeIdx: plan.index, amount: plan.debitAmounts.d1, at: dateAtDay(plan.days.debit1, rng) });
      events.push({ kind: "debit", employeeIdx: plan.index, amount: plan.debitAmounts.d2, at: dateAtDay(plan.days.debit2, rng) });

      if (plan.days.refusal !== undefined && plan.refusalAmount !== undefined) {
        events.push({ kind: "refusal", employeeIdx: plan.index, amount: plan.refusalAmount, at: dateAtDay(plan.days.refusal, rng) });
      }

      events.push({ kind: "grant", employeeIdx: plan.index, amount: plan.grantAmounts.g2, at: dateAtDay(plan.days.grant2, rng) });
      events.push({ kind: "debit", employeeIdx: plan.index, amount: plan.debitAmounts.d3, at: dateAtDay(plan.days.debit3, rng) });
      events.push({ kind: "debit", employeeIdx: plan.index, amount: plan.debitAmounts.d4, at: dateAtDay(plan.days.debit4, rng) });
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    let idemCounter = 0;

    for (const ev of events) {
      const employeeId = employeeIds[ev.employeeIdx];
      const partnerId = partnerIds[randInt(rng, 0, PARTNERS.length - 1)];

      if (ev.kind === "grant") {
        await tx.insert(creditGrants).values({
          employeeId,
          amountCents: toCents(ev.amount),
          grantedAt: ev.at.toISOString(),
        });

        continue;
      }

      if (ev.kind === "debit") {
        const qrCreatedAt = new Date(ev.at.getTime() - 30_000);
        const qrExpiresAt = new Date(qrCreatedAt.getTime() + 5 * 60_000);

        const [qr] = await tx
          .insert(qrCodes)
          .values({
            employeeId: employeeId,
            token: hex(rng, 32),
            createdAt: qrCreatedAt,
            expiresAt: qrExpiresAt,
            usedAt: ev.at,
          })
          .returning({ id: qrCodes.id });

        if (!qr)
          throw new Error(`Failed to create QR code for employee ${employeeId}`);

        const qrCodeId = Number(qr.id);
        idemCounter += 1;

        await tx.insert(transactions).values({
          employeeId,
          partnerId,
          qrCodeId,
          amountCents: toCents(ev.amount),
          idempotencyKey: `seed-${SEED}-${idemCounter}`,
          createdAt: ev.at.toISOString(),
        });

        continue;
      }
      const idempotencyKey = `seed-refusal-probe-${employeeId}-${ev.at.getTime()}`;

      const beforeAttempts = await tx
        .select({ count: count() })
        .from(transactionAttempts)
        .where(eq(transactionAttempts.employeeId, employeeId));

      const beforeAttemptCount = Number(beforeAttempts[0]?.count ?? 0);

      await tx
        .insert(transactions)
        .values({
          employeeId,
          partnerId,
          qrCodeId: null,
          amountCents: toCents(ev.amount),
          idempotencyKey,
          createdAt: ev.at.toISOString(),
        });

      const afterAttempts = await tx
        .select({
          id: transactionAttempts.id,
          status: transactionAttempts.status,
          amountCents: transactionAttempts.amountCents,
        })
        .from(transactionAttempts)
        .where(eq(transactionAttempts.employeeId, employeeId))
        .orderBy(asc(transactionAttempts.id));

      const createdAttempts = afterAttempts.slice(beforeAttemptCount);

      if (createdAttempts.length !== 1) {
        throw new Error(
          `Expected refusal trigger to create exactly one attempt for employee ${employeeId}, got ${createdAttempts.length}`,
        );
      }

      const attempt = createdAttempts[0];

      if (attempt?.status !== "refused_insufficient_balance") {
        throw new Error(
          `Expected refused_insufficient_balance for employee ${employeeId}, got ${attempt?.status}`,
        );
      }

      if (Number(attempt.amountCents) !== toCents(ev.amount)) {
        throw new Error(
          `Refusal amount mismatch for employee ${employeeId}: expected ${toCents(ev.amount)}, got ${attempt?.amountCents}`,
        );
      }

      refusalsLogged += 1;
    }

    const [transactionCount] = await tx
      .select({ count: count() })
      .from(transactions);

    const txCount = Number(transactionCount.count);
    const expected = EMPLOYEE_COUNT * TRANSACTIONS_PER_EMPLOYEE;

    if (txCount !== expected) {
      throw new Error(`Expected ${expected} transactions, got ${txCount}`);
    }

    const balances = await tx
      .select({
        employeeId: employeeBalances.employeeId,
        balanceCents: employeeBalances.balanceCents,
      })
      .from(employeeBalances)
      .orderBy(asc(employeeBalances.employeeId));

    for (const idx of ZERO_BALANCE_EMPLOYEE_INDICES) {
      const row = balances[idx];

      if (!row)
        throw new Error(`Missing balance for employee index ${idx}`);

      const balance = Number(row.balanceCents);

      if (balance !== 0) {
        throw new Error(`Employee index ${idx} expected balance 0, got ${balance} cents`);
      }
    }

    for (const idx of LOW_BALANCE_EMPLOYEE_INDICES) {
      const row = balances[idx];

      if (!row)
        throw new Error(`Missing balance for employee index ${idx}`);

      const balance = Number(row.balanceCents);
      if (!(balance > 0 && balance < 500)) {
        throw new Error(`Employee index ${idx} expected 0<balance<500 cents, got ${balance}`);
      }
    }

    const [attemptCount] = await tx
      .select({ count: count() })
      .from(transactionAttempts);

    if (Number(attemptCount.count) !== refusalsLogged) {
      throw new Error(
        `Expected ${refusalsLogged} transaction attempts, got ${attemptCount.count}`,
      );
    }

    console.log(
      `Committing. ${employeeIds.length} employees, ${partnerIds.length} partners, ${refusalsLogged} refused attempts logged.`,
    );

    const reportIdx = ZERO_BALANCE_EMPLOYEE_INDICES[0];
    const reportId = employeeIds[reportIdx];

    if (reportId === undefined)
      throw new Error("Unable to determine report employee");
    reportEmployeeId = reportId;
  });

  console.log("Transaction committed. Balance guarantees verified against employee_balances view.");

  const csv = await fetchTransactionHistoryCsv(database);
  await Bun.write("transactions.csv", csv);
  console.log(`Wrote transactions.csv (${csv.split("\n").length - 2} data rows).`);

  const reportIdx = ZERO_BALANCE_EMPLOYEE_INDICES[0];
  const plan = plans[reportIdx];

  if (!plan)
    throw new Error(`Missing employee plan at index ${reportIdx}`);

  const grantsRows = await database
    .select({
      amountCents: creditGrants.amountCents,
      grantedAt: creditGrants.grantedAt,
    })
    .from(creditGrants)
    .where(eq(creditGrants.employeeId, reportEmployeeId))
    .orderBy(asc(creditGrants.grantedAt));

  const debitRows = await database
    .select({
      amountCents: transactions.amountCents,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.employeeId, reportEmployeeId))
    .orderBy(asc(transactions.createdAt));

  const totalGrantedCents = grantsRows.reduce((sum, row) => sum + Number(row.amountCents), 0);
  const totalDebitedCents = debitRows.reduce((sum, row) => sum + Number(row.amountCents), 0);

  console.log(`\n--- Cas detaille (employee_id=${reportEmployeeId}, ${plan.firstName} ${plan.lastName}) ---`);

  console.log(
    "Abondements: " +
      grantsRows
        .map(row => `${(Number(row.amountCents) / 100).toFixed(2)}e le ${new Date(row.grantedAt).toISOString().slice(0, 10)}`)
        .join(", "),
  );

  console.log(
    "Debits: " +
      debitRows
        .map(row => `${(Number(row.amountCents) / 100).toFixed(2)}e le ${new Date(row.createdAt).toISOString().slice(0, 10)}`)
        .join(", "),
  );

  const balanceCents = totalGrantedCents - totalDebitedCents;

  console.log(
    `Total: ${(totalGrantedCents / 100).toFixed(2)}e recu - ${(totalDebitedCents / 100).toFixed(2)}e debite = ${(balanceCents / 100).toFixed(2)}e`,
  );
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
