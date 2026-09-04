-- ============================================================================
-- 012 — Swap positions 2/3 from migration 011: Evermere Heart Necklace and
-- Audrey Diamond Hoops were transposed. A fresh side-by-side screenshot of
-- https://auracojewelry.com/product confirmed the real order is Pure
-- Alhambra, Evermere Heart Necklace, Audrey Diamond Hoops (011 had Audrey
-- before Evermere).
-- ============================================================================

UPDATE products SET sort_order = 2 WHERE slug = 'Evermere-Heart-Necklace';
UPDATE products SET sort_order = 3 WHERE slug = 'Audrey-Diamond-Hoops';
