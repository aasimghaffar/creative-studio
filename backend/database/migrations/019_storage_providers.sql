-- ============================================================
-- STORAGE PROVIDERS: where files physically live. Exactly one
-- provider is active; switching affects only future uploads.
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_providers (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(20)     NOT NULL,           -- local / s3 / gcs
    name           VARCHAR(80)     NOT NULL,
    enabled        TINYINT(1)      NOT NULL DEFAULT 0,
    status         ENUM('untested', 'connected', 'failed') NOT NULL DEFAULT 'untested',
    last_error     VARCHAR(255)    NULL,
    last_tested_at DATETIME        NULL,
    credentials    TEXT            NULL,               -- AES-256-GCM encrypted JSON
    created_at     DATETIME        NOT NULL,
    updated_at     DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_storage_providers_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT IGNORE INTO storage_providers (slug, name, enabled, status, created_at, updated_at) VALUES
    ('local', 'Local Storage',        1, 'connected', NOW(), NOW()),
    ('s3',    'Amazon S3',            0, 'untested',  NOW(), NOW()),
    ('gcs',   'Google Cloud Storage', 0, 'untested',  NOW(), NOW());

-- Global upload rules (reuse platform_settings — no duplicate tables).
INSERT IGNORE INTO platform_settings (setting_key, setting_value, updated_at) VALUES
    ('max_upload_size_mb',      '50',           NOW()),
    ('allowed_file_types',      'JPG,PNG,WEBP', NOW()),
    ('max_storage_per_user_gb', '0',            NOW()),   -- 0 = plan limit governs
    ('max_files_per_user',      '0',            NOW());   -- 0 = unlimited
