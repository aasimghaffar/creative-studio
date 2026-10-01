-- ============================================================
-- SYSTEM SETTINGS: email templates, payment gateways, security
-- events + all remaining platform_settings keys.
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug       VARCHAR(40)     NOT NULL,
    name       VARCHAR(120)    NOT NULL,
    subject    VARCHAR(190)    NOT NULL,
    body       TEXT            NOT NULL,
    is_enabled TINYINT(1)      NOT NULL DEFAULT 1,
    updated_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_templates_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT IGNORE INTO email_templates (slug, name, subject, body, is_enabled, updated_at) VALUES
    ('email_verification', 'Email Verification', 'Verify your email — {{site_name}}',
     'Hi {{name}},\n\nPlease confirm your email address to activate your account:\n{{link}}\n\nIf you did not create this account, ignore this email.\n\n— {{site_name}}', 1, NOW()),
    ('password_reset', 'Password Reset', 'Reset your password — {{site_name}}',
     'Hi {{name}},\n\nWe received a request to reset your password. Use this link within 60 minutes:\n{{link}}\n\nIf this was not you, your account is safe — no action needed.\n\n— {{site_name}}', 1, NOW()),
    ('welcome', 'Welcome Email', 'Welcome to {{site_name}}!',
     'Hi {{name}},\n\nYour studio is ready. You start with {{credits}} credits — try the Logo Generator first.\n\nHappy creating!\n— {{site_name}}', 1, NOW()),
    ('subscription_receipt', 'Subscription Receipt', 'Receipt {{invoice}} — {{site_name}}',
     'Hi {{name}},\n\nThanks for subscribing to the {{plan}} plan.\n\nInvoice: {{invoice}}\nAmount: {{amount}}\n\nYour credits and limits are already active.\n\n— {{site_name}}', 1, NOW()),
    ('low_credits', 'Low Credits Warning', 'You are running low on credits — {{site_name}}',
     'Hi {{name}},\n\nHeads up — you have {{credits}} credits left. Top up or upgrade to keep creating without interruption.\n\n— {{site_name}}', 1, NOW()),
    ('generation_failed', 'Generation Failed', 'Your generation could not be completed — {{site_name}}',
     'Hi {{name}},\n\nA {{tool}} generation failed and your {{credits}} credits were refunded automatically.\n\nPlease try again — if it keeps happening, contact support.\n\n— {{site_name}}', 1, NOW());

CREATE TABLE IF NOT EXISTS payment_gateways (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(20)     NOT NULL,
    name        VARCHAR(60)     NOT NULL,
    enabled     TINYINT(1)      NOT NULL DEFAULT 0,
    credentials TEXT            NULL,
    created_at  DATETIME        NOT NULL,
    updated_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_gateways_slug (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT IGNORE INTO payment_gateways (slug, name, enabled, created_at, updated_at) VALUES
    ('stripe',   'Stripe',   0, NOW(), NOW()),
    ('paypal',   'PayPal',   0, NOW(), NOW()),
    ('razorpay', 'Razorpay', 0, NOW(), NOW());

CREATE TABLE IF NOT EXISTS security_events (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NULL,
    event      VARCHAR(190)    NOT NULL,
    actor      VARCHAR(190)    NOT NULL,
    ip         VARCHAR(45)     NOT NULL DEFAULT '',
    tone       ENUM('default', 'teal', 'brass', 'destructive') NOT NULL DEFAULT 'default',
    created_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_security_events_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_settings (setting_key, setting_value, updated_at) VALUES
    ('smtp_host',        '',                     NOW()),
    ('smtp_port',        '587',                  NOW()),
    ('smtp_encryption',  'TLS',                  NOW()),
    ('smtp_username',    '',                     NOW()),
    ('smtp_password',    '',                     NOW()),   -- encrypted when set
    ('mail_from_name',   '',                     NOW()),   -- empty = site_name
    ('mail_from_email',  '',                     NOW()),
    ('currency',         'USD',                  NOW()),
    ('invoice_prefix',   'INV',                  NOW()),
    ('invoice_auto',     '1',                    NOW()),
    ('require_email_verification', '0',          NOW()),
    ('google_login',     '0',                    NOW()),
    ('two_factor',       '0',                    NOW()),
    ('recaptcha_enabled','0',                    NOW()),
    ('recaptcha_site',   '',                     NOW()),
    ('recaptcha_secret', '',                     NOW()),   -- encrypted when set
    ('notify_admin_registration', '1', NOW()), ('notify_user_registration', '1', NOW()),
    ('notify_admin_payment',      '1', NOW()), ('notify_user_payment',      '1', NOW()),
    ('notify_admin_generation',   '0', NOW()), ('notify_user_generation',   '1', NOW()),
    ('notify_admin_credits',      '0', NOW()), ('notify_user_credits',      '1', NOW()),
    ('notify_admin_subscription', '1', NOW()), ('notify_user_subscription', '1', NOW()),
    ('site_name',        'AI Creative Studio',   NOW()),
    ('contact_email',    '',                     NOW()),
    ('default_language', 'English',              NOW()),
    ('time_zone',        'UTC',                  NOW()),
    ('maintenance_mode', '0',                    NOW());
