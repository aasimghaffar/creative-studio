-- ============================================================
-- TOOL-SPECIFIC OPTIONS: avatar framing/expression, tattoo
-- placement/line weight, and any future tool's extras — one JSON
-- column instead of a column per tool.
-- ============================================================
ALTER TABLE ai_generations
    ADD COLUMN options VARCHAR(500) NULL AFTER colors;
