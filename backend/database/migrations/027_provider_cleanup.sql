-- ============================================================
-- FINAL PROVIDER LINEUP
--  * Storage: Local only (S3 + GCS removed; local stays enabled)
--  * Payments: Stripe + PayPal (Razorpay removed)
--  * Coupons module removed entirely
-- ============================================================
DELETE FROM storage_providers WHERE slug <> 'local';
UPDATE storage_providers SET enabled = 1 WHERE slug = 'local';

DELETE FROM payment_gateways WHERE slug = 'razorpay';

DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS coupons;
