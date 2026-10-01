-- ============================================================
-- SETTINGS: user_settings (1:1, mirrors the Settings page tabs)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    theme              ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
    language           VARCHAR(32)     NOT NULL DEFAULT 'English',
    timezone           VARCHAR(64)     NOT NULL DEFAULT 'Europe/London',
    default_image_size VARCHAR(20)     NOT NULL DEFAULT '1024 px',
    default_style      VARCHAR(60)     NOT NULL DEFAULT 'Minimal',
    auto_save_history  TINYINT(1)      NOT NULL DEFAULT 1,
    email_generation   TINYINT(1)      NOT NULL DEFAULT 1,
    email_billing      TINYINT(1)      NOT NULL DEFAULT 1,
    email_product      TINYINT(1)      NOT NULL DEFAULT 0,
    push_enabled       TINYINT(1)      NOT NULL DEFAULT 1,
    two_factor_enabled TINYINT(1)      NOT NULL DEFAULT 0,
    created_at         DATETIME        NOT NULL,
    updated_at         DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_settings_user (user_id),                -- 1:1
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
