-- ============================================================
-- SYSTEM: support_tickets, api_usage
-- (activity_logs already exists — migration 004.)
-- ============================================================

-- Help & Support submissions + admin ticket queue.
CREATE TABLE IF NOT EXISTS support_tickets (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id           BIGINT UNSIGNED NULL,                    -- kept after account deletion
    subject           VARCHAR(190)    NOT NULL,
    topic             ENUM('general', 'bug', 'feature', 'billing') NOT NULL DEFAULT 'general',
    message           MEDIUMTEXT      NOT NULL,
    priority          ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
    status            ENUM('open', 'pending', 'resolved') NOT NULL DEFAULT 'open',
    assigned_admin_id BIGINT UNSIGNED NULL,
    resolved_at       DATETIME        NULL,
    created_at        DATETIME        NOT NULL,
    updated_at        DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_tickets_status_priority (status, priority),
    KEY idx_tickets_user (user_id),
    KEY idx_tickets_assignee (assigned_admin_id),
    CONSTRAINT fk_tickets_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_admin FOREIGN KEY (assigned_admin_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Per-request API metering (feeds the admin API Management page and
-- future rate limiting; aggregate to a daily table when volume demands).
CREATE TABLE IF NOT EXISTS api_usage (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NULL,
    key_prefix  VARCHAR(24)     NULL,                          -- "acs_live_9f2…"
    endpoint    VARCHAR(160)    NOT NULL,                      -- "/api/v1/auth/login"
    method      VARCHAR(8)      NOT NULL,
    status_code SMALLINT UNSIGNED NOT NULL,
    response_ms INT UNSIGNED    NOT NULL DEFAULT 0,
    ip_address  VARCHAR(45)     NULL,
    created_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_api_usage_created (created_at),
    KEY idx_api_usage_user_created (user_id, created_at),
    KEY idx_api_usage_endpoint (endpoint(80)),
    CONSTRAINT fk_api_usage_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
