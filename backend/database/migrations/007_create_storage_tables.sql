-- ============================================================
-- STORAGE: folders, files (folders first — files reference them)
-- ============================================================

-- User folder tree (self-referencing; NULL parent = root level).
CREATE TABLE IF NOT EXISTS folders (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    parent_id  BIGINT UNSIGNED NULL,
    name       VARCHAR(160)    NOT NULL,
    created_at DATETIME        NOT NULL,
    updated_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_folders_user_parent (user_id, parent_id),
    CONSTRAINT fk_folders_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id)
        REFERENCES folders (id) ON DELETE CASCADE               -- deleting a folder deletes subtree
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Uploaded + generated files ("My Files" and the admin File Manager).
CREATE TABLE IF NOT EXISTS files (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        BIGINT UNSIGNED NOT NULL,
    folder_id      BIGINT UNSIGNED NULL,
    generation_id  BIGINT UNSIGNED NULL,                       -- set when AI-generated
    name           VARCHAR(190)    NOT NULL,                   -- without extension
    ext            VARCHAR(10)     NOT NULL,
    mime_type      VARCHAR(120)    NOT NULL,
    type           ENUM('image', 'video', 'audio', 'document') NOT NULL,
    size_bytes     BIGINT UNSIGNED NOT NULL DEFAULT 0,
    width          INT UNSIGNED    NULL,
    height         INT UNSIGNED    NULL,
    storage_disk   ENUM('local', 's3', 'gcs') NOT NULL DEFAULT 'local',
    storage_path   VARCHAR(255)    NOT NULL,                   -- disk-relative path / object key
    download_count INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at     DATETIME        NOT NULL,
    updated_at     DATETIME        NOT NULL,
    deleted_at     DATETIME        NULL,                       -- soft delete (retention window)
    PRIMARY KEY (id),
    KEY idx_files_user_type (user_id, type),
    KEY idx_files_user_created (user_id, created_at),
    KEY idx_files_folder (folder_id),
    KEY idx_files_deleted (deleted_at),
    CONSTRAINT fk_files_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_files_folder FOREIGN KEY (folder_id)
        REFERENCES folders (id) ON DELETE SET NULL,             -- file survives folder deletion
    CONSTRAINT fk_files_generation FOREIGN KEY (generation_id)
        REFERENCES ai_generations (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
