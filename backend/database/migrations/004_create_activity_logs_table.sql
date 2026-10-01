-- Security/audit trail — matches the Activity Logs table in the admin Security page.
CREATE TABLE IF NOT EXISTS activity_logs (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NULL,
    event      VARCHAR(120)    NOT NULL,
    context    JSON            NULL,
    ip_address VARCHAR(45)     NULL,
    created_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_activity_logs_user (user_id),
    KEY idx_activity_logs_event (event),
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
