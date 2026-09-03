CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE employee_status AS ENUM ('active', 'inactive');
CREATE TYPE partner_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE partner_decision AS ENUM ('approved', 'rejected');

CREATE TABLE employees (
    id            BIGSERIAL PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status        employee_status NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partners (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    siren         CHAR(9) NOT NULL CHECK (siren ~ '^\d{9}$'),
    objet_social  TEXT NOT NULL,
    email         CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status        partner_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_status ON partners (status);

CREATE TABLE admin_agents (
    id            BIGSERIAL PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partner_validation_decisions (
    id          BIGSERIAL PRIMARY KEY,
    partner_id  BIGINT NOT NULL REFERENCES partners (id),
    agent_id    BIGINT NOT NULL REFERENCES admin_agents (id),
    decision    partner_decision NOT NULL,
    reason      TEXT NOT NULL,
    decided_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_validation_decisions_partner_id ON partner_validation_decisions (partner_id);

CREATE TABLE credit_grants (
    id           BIGSERIAL PRIMARY KEY,
    employee_id  BIGINT NOT NULL REFERENCES employees (id),
    amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_grants_employee_id ON credit_grants (employee_id);

CREATE TABLE qr_codes (
    id          BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees (id),
    token       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    CHECK (expires_at <= created_at + INTERVAL '5 minutes')
);

CREATE INDEX idx_qr_codes_employee_id ON qr_codes (employee_id);

CREATE TABLE transactions (
    id               BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employees (id),
    partner_id       BIGINT NOT NULL REFERENCES partners (id),
    qr_code_id       BIGINT REFERENCES qr_codes (id),
    amount           NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    idempotency_key  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_transactions_qr_code_id ON transactions (qr_code_id) WHERE qr_code_id IS NOT NULL;
CREATE UNIQUE INDEX idx_transactions_partner_idempotency ON transactions (partner_id, idempotency_key);
CREATE INDEX idx_transactions_employee_id ON transactions (employee_id);

CREATE TABLE transaction_reversals (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  BIGINT NOT NULL UNIQUE REFERENCES transactions (id),
    agent_id        BIGINT NOT NULL REFERENCES admin_agents (id),
    reason          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE VIEW employee_balances AS
SELECT
    e.id AS employee_id,
    COALESCE(g.total_granted, 0) - COALESCE(t.total_debited, 0) AS balance
FROM employees e
LEFT JOIN (
    SELECT employee_id, SUM(amount) AS total_granted
    FROM credit_grants
    GROUP BY employee_id
) g ON g.employee_id = e.id
LEFT JOIN (
    SELECT tr.employee_id, SUM(tr.amount) AS total_debited
    FROM transactions tr
    LEFT JOIN transaction_reversals rv ON rv.transaction_id = tr.id
    WHERE rv.id IS NULL
    GROUP BY tr.employee_id
) t ON t.employee_id = e.id;

CREATE OR REPLACE FUNCTION forbid_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'transactions are immutable: insert a transaction_reversals row instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forbid_transaction_update
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION forbid_transaction_mutation();

CREATE OR REPLACE FUNCTION check_sufficient_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC(10,2);
BEGIN
    PERFORM pg_advisory_xact_lock(NEW.employee_id);

    SELECT balance INTO current_balance
    FROM employee_balances
    WHERE employee_id = NEW.employee_id;

    IF current_balance IS NULL OR current_balance < NEW.amount THEN
        RAISE EXCEPTION 'insufficient_balance: employee % has balance % available, transaction requests %',
            NEW.employee_id, COALESCE(current_balance, 0), NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_sufficient_balance
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION check_sufficient_balance();
