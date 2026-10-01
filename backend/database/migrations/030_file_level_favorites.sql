-- ============================================================
-- FILE-LEVEL FAVORITES (idempotent: safe to run from any state,
-- including a previous partial application).
-- With one history entry per generated image, favorites must be
-- per image file — the old UNIQUE(user, type, generation_id)
-- silently blocked favoriting a second draft of the same run.
-- ============================================================

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorites' AND COLUMN_NAME = 'file_id');
SET @ddl := IF(@has_col = 0,
               'ALTER TABLE favorites ADD COLUMN file_id BIGINT UNSIGNED NULL AFTER generation_id',
               'SELECT 1');
PREPARE m1 FROM @ddl;
EXECUTE m1;
DEALLOCATE PREPARE m1;

SET @has_old := (SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorites' AND INDEX_NAME = 'uq_favorites_image');
SET @ddl := IF(@has_old > 0,
               'ALTER TABLE favorites DROP INDEX uq_favorites_image',
               'SELECT 1');
PREPARE m2 FROM @ddl;
EXECUTE m2;
DEALLOCATE PREPARE m2;

SET @has_new := (SELECT COUNT(*) FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorites' AND INDEX_NAME = 'uq_favorites_file');
SET @ddl := IF(@has_new = 0,
               'ALTER TABLE favorites ADD UNIQUE KEY uq_favorites_file (user_id, type, file_id)',
               'SELECT 1');
PREPARE m3 FROM @ddl;
EXECUTE m3;
DEALLOCATE PREPARE m3;

-- Existing image favorites point at their generation's first file.
-- (No-op when already backfilled.)
UPDATE favorites fv
SET fv.file_id = (
    SELECT MIN(f.id) FROM files f
    WHERE f.generation_id = fv.generation_id AND f.deleted_at IS NULL
)
WHERE fv.type = 'image' AND fv.file_id IS NULL;
