-- ============================================================
-- NOTIFICATIONS (the in-app inbox; categories match the frontend)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    category   ENUM('generation', 'credits', 'subscription', 'payment', 'system') NOT NULL,
    title      VARCHAR(160)    NOT NULL,
    body       VARCHAR(500)    NULL,
    data       JSON            NULL,                           -- deep-link payload etc.
    read_at    DATETIME        NULL,                           -- NULL = unread
    created_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notifications_user_read (user_id, read_at),
    KEY idx_notifications_user_created (user_id, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
