-- ============================================================
-- AI PROVIDERS: backend-driven provider selection with priority
-- fallback. Nothing hardcoded — the manager reads these rows.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_providers (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(40)     NOT NULL,                  -- 'gemini', 'flux'
    name           VARCHAR(80)     NOT NULL,
    api_key        VARCHAR(255)    NULL,
    enabled        TINYINT(1)      NOT NULL DEFAULT 0,
    priority       TINYINT UNSIGNED NOT NULL DEFAULT 2,       -- 1 = primary, 2 = fallback
    status         ENUM('untested', 'connected', 'failed') NOT NULL DEFAULT 'untested',
    last_error     VARCHAR(255)    NULL,
    last_tested_at DATETIME        NULL,
    model          VARCHAR(80)     NOT NULL DEFAULT '',
    timeout_sec    INT UNSIGNED    NOT NULL DEFAULT 120,
    created_at     DATETIME        NOT NULL,
    updated_at     DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_providers_slug (slug),
    KEY idx_ai_providers_enabled_priority (enabled, priority)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- The only two providers at this stage. Keys are pasted in the admin UI.
INSERT IGNORE INTO ai_providers
    (slug, name, api_key, enabled, priority, status, model, timeout_sec, created_at, updated_at)
VALUES
    ('gemini', 'Google Gemini', NULL, 1, 1, 'untested', 'gemini-2.5-flash-image', 120, NOW(), NOW()),
    ('flux',   'FLUX',          NULL, 0, 2, 'untested', 'flux-dev',               120, NOW(), NOW());
