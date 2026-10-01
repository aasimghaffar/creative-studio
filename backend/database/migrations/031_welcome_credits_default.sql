-- ============================================================
-- New users always start with the configured welcome credits —
-- default 10. Admins adjust it in Admin -> Credits Management.
-- (No plan is auto-assigned at signup.)
-- ============================================================
UPDATE platform_settings
SET setting_value = '10'
WHERE setting_key = 'default_free_credits';
