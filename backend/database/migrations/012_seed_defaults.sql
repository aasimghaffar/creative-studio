-- ============================================================
-- SEEDS: the eight AI tools + three plans the frontend expects.
-- INSERT IGNORE + unique slugs = safe to re-run.
-- ============================================================

INSERT IGNORE INTO ai_tools
    (slug, name, category, status, credits_per_generation, prompt_limit,
     upload_support, max_upload_mb, allowed_types, model, timeout_sec, sort_order,
     created_at, updated_at)
VALUES
    ('logo', 'Logo Generator', 'Branding', 'live', 5, 500, 0, 10,
     JSON_ARRAY('JPG', 'PNG', 'WEBP'), 'GPT Image', 60, 1, NOW(), NOW()),
    ('avatar', 'Avatar Generator', 'Portrait', 'live', 8, 500, 1, 20,
     JSON_ARRAY('JPG', 'PNG', 'WEBP'), 'FLUX', 90, 2, NOW(), NOW()),
    ('tattoo', 'Tattoo Generator', 'Illustration', 'live', 8, 400, 0, 10,
     JSON_ARRAY('JPG', 'PNG'), 'Stable Diffusion', 90, 3, NOW(), NOW()),
    ('image', 'Image Generator', 'Rendering', 'disabled', 10, 1000, 1, 20,
     JSON_ARRAY('JPG', 'PNG', 'WEBP'), 'FLUX', 120, 4, NOW(), NOW()),
    ('flyer', 'Flyer Generator', 'Print', 'disabled', 15, 800, 1, 50,
     JSON_ARRAY('JPG', 'PNG', 'PDF'), 'GPT Image', 150, 5, NOW(), NOW()),
    ('interior', 'Interior Designer', 'Rendering', 'disabled', 12, 600, 1, 20,
     JSON_ARRAY('JPG', 'PNG', 'WEBP'), 'Stable Diffusion', 120, 6, NOW(), NOW()),
    ('face-detection', 'Face Detection', 'Vision', 'disabled', 2, 0, 1, 10,
     JSON_ARRAY('JPG', 'PNG'), 'Gemini', 30, 7, NOW(), NOW()),
    ('image-description', 'Image Description', 'Vision', 'disabled', 1, 0, 1, 10,
     JSON_ARRAY('JPG', 'PNG', 'WEBP'), 'Gemini', 30, 8, NOW(), NOW());

INSERT IGNORE INTO plans
    (slug, name, tagline, monthly_price, yearly_price, credits_per_cycle, seats,
     features, is_popular, is_active, sort_order, created_at, updated_at)
VALUES
    ('sketch', 'Sketch', 'For trying ideas on for size.', 0.00, 0.00, 120, 1,
     JSON_ARRAY('Logo & Tattoo studios', '1 project, 1 seat', 'Personal license'),
     0, 1, 1, NOW(), NOW()),
    ('studio', 'Studio', 'For working creatives and small teams.', 29.00, 24.00, 2000, 5,
     JSON_ARRAY('All studios', 'Up to 5 seats', 'Brand kits & history', 'Commercial license'),
     1, 1, 2, NOW(), NOW()),
    ('agency', 'Agency', 'For studios shipping at scale.', NULL, NULL, NULL, 999,
     JSON_ARRAY('Everything in Studio', 'Unlimited seats & SSO', 'Dedicated capacity', 'Indemnification & DPA'),
     0, 1, 3, NOW(), NOW());
