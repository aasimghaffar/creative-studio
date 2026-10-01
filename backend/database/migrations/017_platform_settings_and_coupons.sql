-- ============================================================
-- PLATFORM SETTINGS: global key-value configuration (credits rules
-- first; reusable for future global settings).
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key   VARCHAR(80)     NOT NULL,
    setting_value VARCHAR(190)    NOT NULL,
    updated_at    DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_settings_key (setting_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_settings (setting_key, setting_value, updated_at) VALUES
    ('default_free_credits',  '25', NOW()),
    ('daily_credit_limit',    '0',  NOW()),   -- 0 = no daily cap
    ('monthly_credit_reset',  '0',  NOW()),   -- read by the (future) scheduler
    ('credit_expiry_days',    '0',  NOW());   -- 0 = never expire

-- ============================================================
-- COUPONS: promo codes with redemption budgets.
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code            VARCHAR(30)     NOT NULL,
    discount_type   ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
    discount_value  DECIMAL(10, 2)  NOT NULL,
    max_redemptions INT UNSIGNED    NULL,               -- NULL = unlimited
    redemptions     INT UNSIGNED    NOT NULL DEFAULT 0,
    expires_at      DATE            NULL,               -- NULL = never
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL,
    updated_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_coupons_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
