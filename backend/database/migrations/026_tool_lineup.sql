-- ============================================================
-- FINAL TOOL LINEUP: six tools. Interior Designer and Face
-- Detection are removed everywhere (rows + their generations'
-- orphaned visibility is prevented by cascading app logic).
-- ============================================================
DELETE FROM ai_tools WHERE slug IN ('interior', 'face-detection');
