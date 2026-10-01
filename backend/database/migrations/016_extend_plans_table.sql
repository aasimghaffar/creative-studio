-- Admin Subscription Plans: the fields the module manages beyond the
-- original schema — storage, generation caps, tool access, and badges.
ALTER TABLE plans
    ADD COLUMN storage_gb      INT UNSIGNED NULL AFTER seats,
    ADD COLUMN max_generations INT UNSIGNED NULL AFTER storage_gb,
    ADD COLUMN allowed_tools   JSON         NULL AFTER max_generations,
    ADD COLUMN badge           VARCHAR(40)  NULL AFTER is_popular;

-- Carry the existing "popular" flag into the new badge field.
UPDATE plans SET badge = 'Popular' WHERE is_popular = 1;

-- Sensible defaults for the seeded tiers.
UPDATE plans SET storage_gb = 2,   max_generations = 60   WHERE slug = 'sketch';
UPDATE plans SET storage_gb = 50,  max_generations = 1000 WHERE slug = 'studio';
UPDATE plans SET storage_gb = 500, max_generations = NULL WHERE slug = 'agency';
