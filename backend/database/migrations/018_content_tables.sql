-- ============================================================
-- CONTENT: announcements, help articles, FAQs.
-- FAQs are seeded from the previously hardcoded landing + support
-- lists (merged, deduped) so both surfaces keep their content.
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title        VARCHAR(190)    NOT NULL,
    body         TEXT            NOT NULL,
    audience     VARCHAR(40)     NOT NULL DEFAULT 'all',   -- 'all' or a plan slug
    status       ENUM('draft', 'scheduled', 'published') NOT NULL DEFAULT 'draft',
    publish_at   DATETIME        NULL,                     -- for scheduled posts
    published_at DATETIME        NULL,
    created_by   BIGINT UNSIGNED NULL,
    created_at   DATETIME        NOT NULL,
    updated_at   DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_announcements_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS help_articles (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title      VARCHAR(190)    NOT NULL,
    slug       VARCHAR(190)    NOT NULL,
    category   VARCHAR(80)     NOT NULL DEFAULT 'General',
    body       MEDIUMTEXT      NOT NULL,
    status     ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    views      INT UNSIGNED    NOT NULL DEFAULT 0,
    created_at DATETIME        NOT NULL,
    updated_at DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_help_articles_slug (slug),
    KEY idx_help_articles_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    question   VARCHAR(255)    NOT NULL,
    answer     TEXT            NOT NULL,
    sort_order INT UNSIGNED    NOT NULL DEFAULT 0,
    is_active  TINYINT(1)      NOT NULL DEFAULT 1,
    created_at DATETIME        NOT NULL,
    updated_at DATETIME        NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO faqs (question, answer, sort_order, is_active, created_at, updated_at) VALUES
    ('Do I own what I generate?', 'Yes. Everything you create on a paid plan ships with full commercial usage rights, and Agency plans add indemnification. On the free Sketch plan, assets are licensed for personal and portfolio use.', 0, 1, NOW(), NOW()),
    ('Can AI Creative Studio match my brand''s look?', 'That''s what Brand Kits are for. Upload your palettes, typography, logo treatments, and reference work once — every tool then generates inside those constraints. You can maintain separate kits per client.', 1, 1, NOW(), NOW()),
    ('What models power the studio?', 'A routed mix of frontier and in-house models per medium, updated continuously. You never pick a model — you describe an outcome, and the studio routes to whatever currently does it best.', 2, 1, NOW(), NOW()),
    ('Is my work used to train models?', 'No. Your prompts, uploads, and generations are never used for training. Projects are encrypted at rest, and Agency plans add SSO, audit logs, and a signed DPA.', 3, 1, NOW(), NOW()),
    ('Can my whole team work in one project?', 'Yes — projects are multiplayer. Teammates can comment on specific frames, branch each other''s generations, and hand off between tools without exporting anything.', 4, 1, NOW(), NOW()),
    ('What happens if I hit my generation limit?', 'On Sketch, generations pause until the month resets — nothing is deleted. Studio and Agency plans are unlimited, with fair-use safeguards for automated pipelines.', 5, 1, NOW(), NOW()),
    ('How are credits counted?', 'Each draft in a batch costs 2 credits, so a batch of four is 8 credits. Failed generations are automatically refunded. Credits reset on your billing date and unused ones don''t roll over on the Studio plan.', 6, 1, NOW(), NOW()),
    ('Can I use generations commercially?', 'Yes — everything created on a paid plan ships with full commercial usage rights. The free Sketch plan licenses work for personal and portfolio use only.', 7, 1, NOW(), NOW()),
    ('Where do my downloads go?', 'Downloads save through your browser as SVG or the file''s native format. Everything also stays in My Files and each studio''s Recent History until you delete it.', 8, 1, NOW(), NOW()),
    ('How do I change or cancel my plan?', 'Head to Billing & Plans, pick a plan, and confirm. Changes apply from the next cycle; cancelling keeps your plan active until the period ends.', 9, 1, NOW(), NOW());
