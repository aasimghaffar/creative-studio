-- Password reset tokens: hashed, single-use, one active token per user.
CREATE TABLE IF NOT EXISTS password_resets (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64)        NOT NULL,
    expires_at DATETIME        NOT NULL,
    created_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_password_resets_hash (token_hash),
    KEY idx_password_resets_user (user_id),
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
