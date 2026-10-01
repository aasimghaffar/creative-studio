-- ============================================================
-- AUTHENTICATION (extension): user_profiles, user_sessions
-- users / refresh_tokens / password_resets exist (001–003).
-- ============================================================

-- 1:1 profile data — kept out of `users` so the auth row stays lean.
CREATE TABLE IF NOT EXISTS user_profiles (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    company     VARCHAR(160)    NULL,
    country     VARCHAR(80)     NULL,
    timezone    VARCHAR(64)     NOT NULL DEFAULT 'Europe/London',
    language    VARCHAR(32)     NOT NULL DEFAULT 'English',
    avatar_path VARCHAR(255)    NULL,
    phone       VARCHAR(32)     NULL,
    created_at  DATETIME        NOT NULL,
    updated_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_profiles_user (user_id),                -- enforces 1:1
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Device sessions (the "Active Sessions" list in Settings > Security).
-- Optionally linked to the refresh token that backs the session.
CREATE TABLE IF NOT EXISTS user_sessions (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id          BIGINT UNSIGNED NOT NULL,
    refresh_token_id BIGINT UNSIGNED NULL,
    device           VARCHAR(160)    NULL,                     -- "Chrome · Windows 11"
    ip_address       VARCHAR(45)     NULL,
    user_agent       VARCHAR(255)    NULL,
    location         VARCHAR(120)    NULL,
    last_active_at   DATETIME        NOT NULL,
    revoked_at       DATETIME        NULL,
    created_at       DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_user_sessions_user (user_id, revoked_at),
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_sessions_token FOREIGN KEY (refresh_token_id)
        REFERENCES refresh_tokens (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
