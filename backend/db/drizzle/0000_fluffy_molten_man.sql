-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."partner_decision" AS ENUM('approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."partner_status" AS ENUM('pending', 'validated', 'rejected');--> statement-breakpoint
CREATE TABLE "partners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"siren" char(9) NOT NULL,
	"objet_social" text NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_email_key" UNIQUE("email"),
	CONSTRAINT "partners_siren_check" CHECK (siren ~ '^\d{9}$'::text)
);
--> statement-breakpoint
CREATE TABLE "partner_validation_decisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"agent_id" bigint NOT NULL,
	"decision" "partner_decision" NOT NULL,
	"reason" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_agents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_agents_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"employee_id" bigint NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "qr_codes_token_key" UNIQUE("token"),
	CONSTRAINT "qr_codes_check" CHECK (expires_at <= (created_at + '00:05:00'::interval))
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "credit_grants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"employee_id" bigint NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_grants_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"employee_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"qr_code_id" bigint,
	"amount" numeric(10, 2) NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "transaction_reversals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"transaction_id" bigint NOT NULL,
	"agent_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_reversals_transaction_id_key" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "partner_validation_decisions" ADD CONSTRAINT "partner_validation_decisions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_validation_decisions" ADD CONSTRAINT "partner_validation_decisions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."admin_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reversals" ADD CONSTRAINT "transaction_reversals_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_reversals" ADD CONSTRAINT "transaction_reversals_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."admin_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_partners_status" ON "partners" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_partner_validation_decisions_partner_id" ON "partner_validation_decisions" USING btree ("partner_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_qr_codes_employee_id" ON "qr_codes" USING btree ("employee_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_credit_grants_employee_id" ON "credit_grants" USING btree ("employee_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_employee_id" ON "transactions" USING btree ("employee_id" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_partner_idempotency" ON "transactions" USING btree ("partner_id" int8_ops,"idempotency_key" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_qr_code_id" ON "transactions" USING btree ("qr_code_id" int8_ops) WHERE (qr_code_id IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."employee_balances" AS (SELECT e.id AS employee_id, COALESCE(g.total_granted, 0::numeric) - COALESCE(t.total_debited, 0::numeric) AS balance FROM employees e LEFT JOIN ( SELECT credit_grants.employee_id, sum(credit_grants.amount) AS total_granted FROM credit_grants GROUP BY credit_grants.employee_id) g ON g.employee_id = e.id LEFT JOIN ( SELECT tr.employee_id, sum(tr.amount) AS total_debited FROM transactions tr LEFT JOIN transaction_reversals rv ON rv.transaction_id = tr.id WHERE rv.id IS NULL GROUP BY tr.employee_id) t ON t.employee_id = e.id);
*/