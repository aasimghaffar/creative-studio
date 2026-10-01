-- Phase: Admin AI Tools.
-- Default availability: only Logo, Avatar, and Tattoo are live; every
-- other tool starts disabled until an admin enables it.
UPDATE ai_tools SET status = 'live', updated_at = NOW()
WHERE slug IN ('logo', 'avatar', 'tattoo');

UPDATE ai_tools SET status = 'disabled', updated_at = NOW()
WHERE slug NOT IN ('logo', 'avatar', 'tattoo');
