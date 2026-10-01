-- ============================================================
-- AI: ai_tools, ai_generations, generation_history, favorites
-- ============================================================

-- Tool catalogue + per-tool configuration (the admin AI Tools page).
CREATE TABLE IF NOT EXISTS ai_tools (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug                   VARCHAR(60)     NOT NULL,           -- "logo", "avatar", …
    name                   VARCHAR(120)    NOT NULL,
    category               VARCHAR(80)     NOT NULL,
    description            VARCHAR(255)    NULL,
    status                 ENUM('live', 'beta', 'disabled') NOT NULL DEFAULT 'beta',
    credits_per_generation INT UNSIGNED    NOT NULL DEFAULT 5,
    prompt_limit           INT UNSIGNED    NOT NULL DEFAULT 500,  -- characters; 0 = no prompt
    upload_support         TINYINT(1)      NOT NULL DEFAULT 0,
    max_upload_mb          INT UNSIGNED    NOT NULL DEFAULT 10,
    allowed_types          JSON            NULL,               -- ["JPG","PNG","WEBP"]
    model                  VARCHAR(80)     NOT NULL DEFAULT 'GPT Image',
    timeout_sec            INT UNSIGNED    NOT NULL DEFAULT 60,
    sort_order             INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at             DATETIME        NOT NULL,
    updated_at             DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_tools_slug (slug),
    KEY idx_ai_tools_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- One row per generation request — the system-of-record (audit, billing).
CREATE TABLE IF NOT EXISTS ai_generations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    tool_id         BIGINT UNSIGNED NOT NULL,
    prompt          TEXT            NULL,
    negative_prompt TEXT            NULL,
    style           VARCHAR(80)     NULL,
    color           VARCHAR(16)     NULL,                      -- "#B8823C"
    ratio           VARCHAR(10)     NULL,                      -- "1:1", "16:9"
    quantity        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    seed            VARCHAR(64)     NULL,
    quality         VARCHAR(40)     NULL,
    status          ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
    credits_used    INT UNSIGNED    NOT NULL DEFAULT 0,
    error_message   VARCHAR(255)    NULL,
    started_at      DATETIME        NULL,
    completed_at    DATETIME        NULL,
    created_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_generations_user_created (user_id, created_at),
    KEY idx_generations_tool (tool_id),
    KEY idx_generations_status (status),
    CONSTRAINT fk_generations_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_generations_tool FOREIGN KEY (tool_id)
        REFERENCES ai_tools (id) ON DELETE RESTRICT,           -- never orphan usage records
    CONSTRAINT chk_generations_quantity CHECK (quantity BETWEEN 1 AND 12)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- The user-facing history entry (Recent History / Global History pages).
-- Separate from ai_generations so users can delete history without
-- touching the audit trail. thumb = the renderer spec used by the UI.
CREATE TABLE IF NOT EXISTS generation_history (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    generation_id BIGINT UNSIGNED NOT NULL,
    tool_id       BIGINT UNSIGNED NOT NULL,
    prompt        TEXT            NULL,                        -- snapshot at generation time
    thumb         JSON            NULL,                        -- {"colors":["#..","#.."],"variant":0}
    credits_used  INT UNSIGNED    NOT NULL DEFAULT 0,
    status        ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'completed',
    is_favorite   TINYINT(1)      NOT NULL DEFAULT 0,
    created_at    DATETIME        NOT NULL,
    deleted_at    DATETIME        NULL,                        -- soft delete
    PRIMARY KEY (id),
    UNIQUE KEY uq_history_generation (generation_id),          -- 1:1 with the audit row
    KEY idx_history_user_created (user_id, created_at),
    KEY idx_history_user_favorite (user_id, is_favorite),
    CONSTRAINT fk_history_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_generation FOREIGN KEY (generation_id)
        REFERENCES ai_generations (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_tool FOREIGN KEY (tool_id)
        REFERENCES ai_tools (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Saved items: favorite IMAGES (point at a generation) and favorite
-- PROMPTS (store the text). Exactly one of the two shapes per row.
CREATE TABLE IF NOT EXISTS favorites (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    type          ENUM('image', 'prompt') NOT NULL,
    generation_id BIGINT UNSIGNED NULL,                        -- required when type = image
    tool_id       BIGINT UNSIGNED NULL,
    prompt_text   TEXT            NULL,                        -- required when type = prompt
    created_at    DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_favorites_image (user_id, type, generation_id),  -- no duplicate image favs
    KEY idx_favorites_user (user_id, type),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_generation FOREIGN KEY (generation_id)
        REFERENCES ai_generations (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_tool FOREIGN KEY (tool_id)
        REFERENCES ai_tools (id) ON DELETE SET NULL,
    CONSTRAINT chk_favorites_shape CHECK (
        (type = 'image'  AND generation_id IS NOT NULL) OR
        (type = 'prompt' AND prompt_text  IS NOT NULL)
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
