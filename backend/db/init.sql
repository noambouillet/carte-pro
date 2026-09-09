CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE employee_status AS ENUM ('active', 'inactive');
CREATE TYPE partner_status AS ENUM ('pending', 'validated', 'rejected', 'archived');
CREATE TYPE partner_decision AS ENUM ('approved', 'rejected');
CREATE TYPE transaction_attempt_status AS ENUM ('refused_insufficient_balance');

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
    first_name    TEXT,
    last_name     TEXT,
    siren         CHAR(9) CHECK (siren ~ '^\d{9}$'),
    objet_social  TEXT,
    region       TEXT,
    name          TEXT,
    email         CITEXT UNIQUE,
    phone         TEXT,
    password_hash TEXT,
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
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
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
    CHECK (
        expires_at > created_at
        AND expires_at <= created_at + INTERVAL '5 minutes'
    )
);

CREATE INDEX idx_qr_codes_employee_id ON qr_codes (employee_id);

CREATE SEQUENCE transaction_events_id_seq;

CREATE TABLE transactions (
    id               BIGINT PRIMARY KEY DEFAULT nextval('transaction_events_id_seq'),
    employee_id      BIGINT NOT NULL REFERENCES employees (id),
    partner_id       BIGINT NOT NULL REFERENCES partners (id),
    qr_code_id       BIGINT REFERENCES qr_codes (id),
    amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
    idempotency_key  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_transactions_qr_code_id ON transactions (qr_code_id) WHERE qr_code_id IS NOT NULL;
CREATE UNIQUE INDEX idx_transactions_partner_idempotency ON transactions (partner_id, idempotency_key);
CREATE INDEX idx_transactions_employee_id ON transactions (employee_id);
CREATE INDEX idx_transactions_created_at ON transactions (created_at);

CREATE TABLE transaction_attempts (
    id               BIGINT PRIMARY KEY DEFAULT nextval('transaction_events_id_seq'),
    employee_id      BIGINT NOT NULL REFERENCES employees (id),
    partner_id       BIGINT NOT NULL REFERENCES partners (id),
    qr_code_id       BIGINT REFERENCES qr_codes (id),
    amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
    status           transaction_attempt_status NOT NULL,
    idempotency_key TEXT NOT NULL,
    attempted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_attempts_employee_id ON transaction_attempts (employee_id);
CREATE INDEX idx_transaction_attempts_attempted_at ON transaction_attempts (attempted_at);
CREATE UNIQUE INDEX idx_transaction_attempts_partner_idempotency ON transaction_attempts (partner_id, idempotency_key);

CREATE VIEW employee_balances AS
SELECT
    e.id AS employee_id,
    COALESCE(g.total_granted_cents, 0)
        - COALESCE(t.total_debited_cents, 0) AS balance_cents
FROM employees e
LEFT JOIN (
    SELECT
        employee_id,
        SUM(amount_cents) AS total_granted_cents
    FROM credit_grants
    GROUP BY employee_id
) g ON g.employee_id = e.id
LEFT JOIN (
    SELECT
        employee_id,
        SUM(amount_cents) AS total_debited_cents
    FROM transactions
    GROUP BY employee_id
) t ON t.employee_id = e.id;

CREATE OR REPLACE VIEW transaction_history AS
SELECT
    g.id,
    g.granted_at AS occurred_at,
    g.employee_id,
    NULL::BIGINT AS partner_id,
    NULL::BIGINT AS qr_code_id,
    g.amount_cents,
    'credit_granted'::TEXT AS status
FROM credit_grants g
UNION ALL
SELECT
    t.id,
    t.created_at AS occurred_at,
    t.employee_id,
    t.partner_id,
    t.qr_code_id,
    -t.amount_cents AS amount_cents,
    'approved'::TEXT AS status
FROM transactions t
UNION ALL
SELECT
    a.id,
    a.attempted_at AS occurred_at,
    a.employee_id,
    a.partner_id,
    a.qr_code_id,
    -a.amount_cents AS amount_cents,
    a.status::TEXT AS status
FROM transaction_attempts a;

CREATE OR REPLACE FUNCTION forbid_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'transactions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forbid_transaction_update
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION forbid_transaction_mutation();

CREATE TRIGGER trg_forbid_transaction_attempt_mutation
BEFORE UPDATE OR DELETE ON transaction_attempts
FOR EACH ROW EXECUTE FUNCTION forbid_transaction_mutation();

CREATE OR REPLACE FUNCTION process_payment(
    p_partner_id BIGINT,
    p_employee_id BIGINT,
    p_qr_code_id BIGINT,
    p_amount_cents BIGINT,
    p_idempotency_key TEXT
)
RETURNS TABLE (
    transaction_id BIGINT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance BIGINT;
    v_transaction_id BIGINT;
    v_attempt_status transaction_attempt_status;
BEGIN
    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'payment amount must be greater than zero';
    END IF;

    PERFORM pg_advisory_xact_lock(p_employee_id);

    SELECT id INTO v_transaction_id
    FROM transactions
    WHERE partner_id = p_partner_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN QUERY SELECT v_transaction_id, 'approved'::TEXT;
        RETURN;
    END IF;

    SELECT ta.status INTO v_attempt_status FROM transaction_attempts
    AS ta WHERE ta.partner_id = p_partner_id AND ta.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN QUERY SELECT NULL::BIGINT, v_attempt_status::TEXT;
        RETURN;
    END IF;

    PERFORM 1 FROM employees AS e WHERE e.id = p_employee_id AND e.status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'employee does not exist or is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM partners AS p WHERE p.id = p_partner_id AND p.status = 'validated') THEN
        RAISE EXCEPTION 'partner is not validated';
    END IF;

    PERFORM 1 FROM qr_codes AS q WHERE q.id = p_qr_code_id
        AND q.employee_id = p_employee_id AND q.used_at IS NULL
        AND now() < q.expires_at FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid or expired QR code';
    END IF;

    SELECT balance_cents INTO v_balance FROM employee_balances WHERE employee_id = p_employee_id;
    v_balance := COALESCE(v_balance, 0);

    IF v_balance < p_amount_cents THEN
        INSERT INTO transaction_attempts (
            employee_id, partner_id, qr_code_id, amount_cents, status, idempotency_key
        ) VALUES (
            p_employee_id, p_partner_id, p_qr_code_id, p_amount_cents,
            'refused_insufficient_balance', p_idempotency_key
        );

        RETURN QUERY SELECT NULL::BIGINT, 'refused_insufficient_balance'::TEXT;
        RETURN;
    END IF;

    INSERT INTO transactions (employee_id, partner_id, qr_code_id, amount_cents, idempotency_key)
    VALUES (p_employee_id, p_partner_id, p_qr_code_id, p_amount_cents, p_idempotency_key)
    RETURNING id INTO v_transaction_id;

    UPDATE qr_codes SET used_at = now() WHERE id = p_qr_code_id;

    RETURN QUERY SELECT v_transaction_id, 'approved'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION check_sufficient_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance BIGINT;
BEGIN
    PERFORM pg_advisory_xact_lock(NEW.employee_id);

    SELECT balance_cents INTO current_balance FROM employee_balances WHERE employee_id = NEW.employee_id;
    current_balance := COALESCE(current_balance, 0);

    IF current_balance < NEW.amount_cents THEN
        INSERT INTO transaction_attempts (
            employee_id,
            partner_id,
            qr_code_id,
            amount_cents,
            status,
            idempotency_key
        )
        VALUES (
            NEW.employee_id,
            NEW.partner_id,
            NEW.qr_code_id,
            NEW.amount_cents,
            'refused_insufficient_balance',
            NEW.idempotency_key
        )
        ON CONFLICT (partner_id, idempotency_key) DO NOTHING;
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_sufficient_balance
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION check_sufficient_balance();
