-- ============================================================
-- Repair payment records written while a leftover x12 existed in
-- the activation path: yearly payments recorded as 12x the plan's
-- stored yearly total (e.g. a $288 plan recorded as $3,456).
-- Only rows exactly matching 12x their plan's yearly total change.
-- ============================================================
UPDATE payments p
INNER JOIN subscriptions s ON s.id = p.subscription_id
INNER JOIN plans pl        ON pl.id = s.plan_id
SET p.amount = pl.yearly_price
WHERE s.billing_cycle = 'yearly'
  AND pl.yearly_price IS NOT NULL
  AND pl.yearly_price > 0
  AND ABS(p.amount - (pl.yearly_price * 12)) < 0.01;
