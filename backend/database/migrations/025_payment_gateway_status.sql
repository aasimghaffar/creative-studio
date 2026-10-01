-- ============================================================
-- FIX: payment_gateways never had a status column; the Test
-- Connection endpoint records its last result here.
-- ============================================================
ALTER TABLE payment_gateways
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'untested' AFTER environment;
