-- ============================================================
-- LOGO GENERATOR OPTIONS: seed removed (it was never consumed by
-- the AI provider), template + multi-color palette added.
-- ============================================================
ALTER TABLE ai_generations
    DROP COLUMN seed,
    ADD COLUMN template VARCHAR(80) NULL AFTER negative_prompt,
    ADD COLUMN colors VARCHAR(120) NULL AFTER color;
