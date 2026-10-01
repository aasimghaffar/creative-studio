-- ============================================================
-- 1) SINGLE SOURCE OF TRUTH FOR PRICING:
--    plans.yearly_price now stores the TOTAL charged per year
--    (previously the per-month rate when billed yearly).
--    Checkout charges this value directly — no multiplication.
-- 2) Language setting removed (will return with real i18n).
-- ============================================================
UPDATE plans
SET yearly_price = ROUND(yearly_price * 12, 2)
WHERE yearly_price IS NOT NULL AND yearly_price > 0;

ALTER TABLE user_settings DROP COLUMN language;

DELETE FROM platform_settings WHERE setting_key = 'default_language';
