import { pgTable, index, unique, check, bigserial, text, char, timestamp, foreignKey, bigint, uniqueIndex, pgView, numeric, pgSequence, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

const citext = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "citext";
  },
});

export const employeeStatus = pgEnum("employee_status", ["active", "inactive"]);

export const partnerDecision = pgEnum("partner_decision", ["approved", "rejected"]);

export const partnerStatus = pgEnum("partner_status", ["pending", "validated", "rejected"]);

export const transactionAttemptStatus = pgEnum("transaction_attempt_status", ["refused_insufficient_balance"]);

export const transactionEventsIdSeq = pgSequence("transaction_events_id_seq", {
  startWith: "1",
  increment: "1",
  minValue: "1",
  maxValue: "9223372036854775807",
  cache: "1",
  cycle: false,
});

export const partners = pgTable(
  "partners",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    name: text(),
    siren: char({ length: 9 }),
    objetSocial: text("objet_social"),
    address: text(),
    email: citext("email"),
    passwordHash: text("password_hash"),
    status: partnerStatus().default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_partners_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    unique("partners_email_key").on(table.email),
    check("partners_siren_check", sql`siren ~ '^\\d{9}$'::text`),
  ],
);

export const partnerValidationDecisions = pgTable(
  "partner_validation_decisions",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    partnerId: bigint("partner_id", { mode: "number" }).notNull(),
    agentId: bigint("agent_id", { mode: "number" }).notNull(),
    decision: partnerDecision().notNull(),
    reason: text().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_partner_validation_decisions_partner_id").using("btree", table.partnerId.asc().nullsLast().op("int8_ops")),
    foreignKey({ columns: [table.partnerId], foreignColumns: [partners.id], name: "partner_validation_decisions_partner_id_fkey" }),
    foreignKey({ columns: [table.agentId], foreignColumns: [adminAgents.id], name: "partner_validation_decisions_agent_id_fkey" }),
  ],
);

export const adminAgents = pgTable(
  "admin_agents",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: citext("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("admin_agents_email_key").on(table.email),
  ],
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    employeeId: bigint("employee_id", { mode: "number" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_qr_codes_employee_id").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
    foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "qr_codes_employee_id_fkey" }),
    unique("qr_codes_token_key").on(table.token),
    check("qr_codes_check", sql`(expires_at > created_at) AND (expires_at <= (created_at + '00:05:00'::interval))`),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: citext("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: employeeStatus().default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    unique("employees_email_key").on(table.email),
  ],
);

export const creditGrants = pgTable(
  "credit_grants",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    employeeId: bigint("employee_id", { mode: "number" }).notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_credit_grants_employee_id").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
    foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "credit_grants_employee_id_fkey" }),
    check("credit_grants_amount_cents_check", sql`amount_cents > 0`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: bigint({ mode: "number" }).default(sql`nextval('transaction_events_id_seq'::regclass)`).primaryKey().notNull(),
    employeeId: bigint("employee_id", { mode: "number" }).notNull(),
    partnerId: bigint("partner_id", { mode: "number" }).notNull(),
    qrCodeId: bigint("qr_code_id", { mode: "number" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_transactions_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    index("idx_transactions_employee_id").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
    uniqueIndex("idx_transactions_partner_idempotency").using("btree", table.partnerId.asc().nullsLast().op("int8_ops"), table.idempotencyKey.asc().nullsLast().op("text_ops")),
    uniqueIndex("idx_transactions_qr_code_id").using("btree", table.qrCodeId.asc().nullsLast().op("int8_ops")).where(sql`(qr_code_id IS NOT NULL)`),
    foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "transactions_employee_id_fkey" }),
    foreignKey({ columns: [table.partnerId], foreignColumns: [partners.id], name: "transactions_partner_id_fkey" }),
    foreignKey({ columns: [table.qrCodeId], foreignColumns: [qrCodes.id], name: "transactions_qr_code_id_fkey" }),
    check("transactions_amount_cents_check", sql`amount_cents > 0`),
  ],
);

export const transactionAttempts = pgTable(
  "transaction_attempts",
  {
    id: bigint({ mode: "number" }).default(sql`nextval('transaction_events_id_seq'::regclass)`).primaryKey().notNull(),
    employeeId: bigint("employee_id", { mode: "number" }).notNull(),
    partnerId: bigint("partner_id", { mode: "number" }).notNull(),
    qrCodeId: bigint("qr_code_id", { mode: "number" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    status: transactionAttemptStatus().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_transaction_attempts_attempted_at").using("btree", table.attemptedAt.asc().nullsLast().op("timestamptz_ops")),
    index("idx_transaction_attempts_employee_id").using("btree", table.employeeId.asc().nullsLast().op("int8_ops")),
    uniqueIndex("idx_transaction_attempts_partner_idempotency").using("btree", table.partnerId.asc().nullsLast().op("int8_ops"), table.idempotencyKey.asc().nullsLast().op("text_ops")),
    foreignKey({ columns: [table.employeeId], foreignColumns: [employees.id], name: "transaction_attempts_employee_id_fkey" }),
    foreignKey({ columns: [table.partnerId], foreignColumns: [partners.id], name: "transaction_attempts_partner_id_fkey" }),
    foreignKey({ columns: [table.qrCodeId], foreignColumns: [qrCodes.id], name: "transaction_attempts_qr_code_id_fkey" }),
    check("transaction_attempts_amount_cents_check", sql`amount_cents > 0`),
  ],
);

export const transactionReversals = pgTable(
  "transaction_reversals",
  {
    id: bigserial({ mode: "number" }).primaryKey().notNull(),
    transactionId: bigint("transaction_id", { mode: "number" }).notNull(),
    agentId: bigint("agent_id", { mode: "number" }).notNull(),
    reason: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.transactionId], foreignColumns: [transactions.id], name: "transaction_reversals_transaction_id_fkey" }),
    foreignKey({ columns: [table.agentId], foreignColumns: [adminAgents.id], name: "transaction_reversals_agent_id_fkey" }),
    unique("transaction_reversals_transaction_id_key").on(table.transactionId),
  ],
);

export const employeeBalances = pgView(
  "employee_balances",
  {
    employeeId: bigint("employee_id", { mode: "number" }),
    balanceCents: numeric("balance_cents"),
  },
).as(
  sql`
    SELECT
      e.id AS employee_id,
      COALESCE(g.total_granted_cents, 0::numeric) - COALESCE(t.total_debited_cents, 0::numeric) AS balance_cents
    FROM employees e
    LEFT JOIN (
      SELECT credit_grants.employee_id, sum(credit_grants.amount_cents) AS total_granted_cents
      FROM credit_grants
      GROUP BY credit_grants.employee_id
    ) g ON g.employee_id = e.id
    LEFT JOIN (
      SELECT transactions.employee_id, sum(transactions.amount_cents) AS total_debited_cents
      FROM transactions
      GROUP BY transactions.employee_id
    ) t ON t.employee_id = e.id
  `,
);

export const transactionHistory = pgView(
  "transaction_history",
  {
    id: bigint({ mode: "number" }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    employeeId: bigint("employee_id", { mode: "number" }).notNull(),
    partnerId: bigint("partner_id", { mode: "number" }),
    qrCodeId: bigint("qr_code_id", { mode: "number" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    status: text().notNull(),
  },
).as(
  sql`
    SELECT
      g.id,
      g.granted_at AS occurred_at,
      g.employee_id,
      NULL::bigint AS partner_id,
      NULL::bigint AS qr_code_id,
      g.amount_cents,
      'credit_granted'::text AS status
    FROM credit_grants g

    UNION ALL

    SELECT
      t.id,
      t.created_at AS occurred_at,
      t.employee_id,
      t.partner_id,
      t.qr_code_id,
      -t.amount_cents AS amount_cents,
      'approved'::text AS status
    FROM transactions t

    UNION ALL

    SELECT
      a.id,
      a.attempted_at AS occurred_at,
      a.employee_id,
      a.partner_id,
      a.qr_code_id,
      -a.amount_cents AS amount_cents,
      a.status::text AS status
    FROM transaction_attempts a
  `,
);
