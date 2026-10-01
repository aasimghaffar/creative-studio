-- ============================================================
-- POLLINATIONS AI: free, keyless image provider — a third option
-- alongside Gemini and FLUX. Disabled by default; the admin
-- enables it and sets its priority like any other provider.
-- ============================================================
INSERT IGNORE INTO ai_providers
    (slug, name, api_key, enabled, priority, status, model, timeout_sec, created_at, updated_at)
VALUES
    ('pollinations', 'Pollinations AI', NULL, 0, 3, 'untested', '', 120, NOW(), NOW());
