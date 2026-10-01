-- ============================================================
-- Provider test/runtime errors can be long (Gemini quota answers
-- especially) — store them whole so the admin sees the full reason.
-- ============================================================
ALTER TABLE ai_providers MODIFY last_error TEXT NULL;
