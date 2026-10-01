-- Users: shared by the user dashboard and admin panel.
-- role/status/credits columns anticipate the admin features already designed in the frontend.
CREATE TABLE IF NOT EXISTS users (
    id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name              VARCHAR(120)     NOT NULL,
    email             VARCHAR(190)     NOT NULL,
    password_hash     VARCHAR(255)     NOT NULL,
    role              ENUM('user', 'admin')                 NOT NULL DEFAULT 'user',
    status            ENUM('active', 'suspended', 'trial')  NOT NULL DEFAULT 'active',
    credits           INT UNSIGNED     NOT NULL DEFAULT 20,
    email_verified_at DATETIME         NULL,
    last_login_at     DATETIME         NULL,
    created_at        DATETIME         NOT NULL,
    updated_at        DATETIME         NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
