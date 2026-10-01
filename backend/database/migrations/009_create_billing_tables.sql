-- ============================================================
-- BILLING: plans, subscriptions, payments, credit_transactions
-- ============================================================

-- Purchasable tiers (Sketch / Studio / Agency). NULL price = custom quote,
-- NULL credits_per_cycle = unlimited.
CREATE TABLE IF NOT EXISTS plans (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug              VARCHAR(60)     NOT NULL,
    name              VARCHAR(120)    NOT NULL,
    tagline           VARCHAR(190)    NULL,
    monthly_price     DECIMAL(8, 2)   NULL,
    yearly_price      DECIMAL(8, 2)   NULL,                    -- per-seat/month billed yearly
    credits_per_cycle INT UNSIGNED    NULL,
    seats             INT UNSIGNED    NOT NULL DEFAULT 1,
    features          JSON            NULL,                    -- ["All studios", …]
    is_popular        TINYINT(1)      NOT NULL DEFAULT 0,
    is_active         TINYINT(1)      NOT NULL DEFAULT 1,
    sort_order        INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at        DATETIME        NOT NULL,
    updated_at        DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_plans_slug (slug),
    KEY idx_plans_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- A user's plan over time. History preserved: one 'active'-ish row at a
-- time per user (enforced at the service layer), old rows become
-- canceled/expired.
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT UNSIGNED NOT NULL,
    plan_id                 BIGINT UNSIGNED NOT NULL,
    billing_cycle           ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    status                  ENUM('trialing', 'active', 'past_due', 'canceled', 'expired')
                                            NOT NULL DEFAULT 'active',
    current_period_start    DATETIME        NOT NULL,
    current_period_end      DATETIME        NOT NULL,
    cancel_at_period_end    TINYINT(1)      NOT NULL DEFAULT 0,
    gateway                 ENUM('stripe', 'paypal', 'razorpay', 'manual') NOT NULL DEFAULT 'manual',
    gateway_subscription_id VARCHAR(190)    NULL,
    created_at              DATETIME        NOT NULL,
    updated_at              DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscriptions_gateway_id (gateway_subscription_id),
    KEY idx_subscriptions_user_status (user_id, status),
    KEY idx_subscriptions_period_end (current_period_end),     -- renewal/expiry cron scans
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id)
        REFERENCES plans (id) ON DELETE RESTRICT               -- plans with history can't vanish
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Financial records. user_id is nullable + SET NULL so accounting data
-- survives account deletion (books must balance even if users leave).
CREATE TABLE IF NOT EXISTS payments (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NULL,
    subscription_id    BIGINT UNSIGNED NULL,
    gateway            ENUM('stripe', 'paypal', 'razorpay', 'manual') NOT NULL,
    gateway_payment_id VARCHAR(190)    NULL,
    invoice_no         VARCHAR(40)     NOT NULL,               -- "INV-2026-0142"
    description        VARCHAR(190)    NOT NULL,
    amount             DECIMAL(10, 2)  NOT NULL,
    currency           CHAR(3)         NOT NULL DEFAULT 'USD',
    status             ENUM('paid', 'pending', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    paid_at            DATETIME        NULL,
    created_at         DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payments_invoice (invoice_no),
    UNIQUE KEY uq_payments_gateway_id (gateway_payment_id),
    KEY idx_payments_user_created (user_id, created_at),
    KEY idx_payments_status (status),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id)
        REFERENCES subscriptions (id) ON DELETE SET NULL,
    CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Append-only credit ledger. amount is signed (+grant / -spend);
-- balance_after makes the current balance a single indexed lookup and
-- makes any discrepancy auditable line by line.
CREATE TABLE IF NOT EXISTS credit_transactions (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    amount        INT             NOT NULL,                    -- signed
    balance_after INT             NOT NULL,
    type          ENUM('grant', 'purchase', 'spend', 'refund', 'adjustment', 'expiry') NOT NULL,
    generation_id BIGINT UNSIGNED NULL,                        -- spend/refund source
    payment_id    BIGINT UNSIGNED NULL,                        -- purchase source
    admin_id      BIGINT UNSIGNED NULL,                        -- manual adjustment actor
    note          VARCHAR(190)    NULL,
    created_at    DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_credit_tx_user_created (user_id, created_at),
    KEY idx_credit_tx_type (type),
    CONSTRAINT fk_credit_tx_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_tx_generation FOREIGN KEY (generation_id)
        REFERENCES ai_generations (id) ON DELETE SET NULL,
    CONSTRAINT fk_credit_tx_payment FOREIGN KEY (payment_id)
        REFERENCES payments (id) ON DELETE SET NULL,
    CONSTRAINT fk_credit_tx_admin FOREIGN KEY (admin_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_credit_tx_amount CHECK (amount <> 0),
    CONSTRAINT chk_credit_tx_balance CHECK (balance_after >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
