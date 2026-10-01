-- ============================================================
-- PRODUCTION PAYMENTS: gateway environment, webhook logs
-- (dedupe + audit), subscription history, webhook refs.
-- ============================================================
ALTER TABLE payment_gateways
    ADD COLUMN environment ENUM('sandbox', 'production') NOT NULL DEFAULT 'sandbox' AFTER enabled;

ALTER TABLE payments
    ADD COLUMN plan_id BIGINT UNSIGNED NULL AFTER subscription_id,
    ADD COLUMN billing_cycle VARCHAR(10) NULL AFTER plan_id,
    ADD COLUMN webhook_ref VARCHAR(190) NULL AFTER gateway_payment_id,
    ADD COLUMN meta TEXT NULL;

CREATE TABLE IF NOT EXISTS webhook_logs (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    gateway     VARCHAR(20)     NOT NULL,
    event_id    VARCHAR(190)    NOT NULL,           -- gateway's event id (dedupe key)
    event_type  VARCHAR(120)    NOT NULL,
    status      ENUM('processed', 'skipped', 'invalid') NOT NULL,
    message     VARCHAR(255)    NULL,
    created_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_webhook_event (gateway, event_id),
    KEY idx_webhook_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_history (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    plan_name  VARCHAR(80)     NOT NULL,
    action     ENUM('activated', 'renewed', 'switched', 'canceled', 'expired') NOT NULL,
    note       VARCHAR(255)    NULL,
    created_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_subhist_user (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
