-- ============================================================================
-- 011 — Correct the product order to match the REAL rendered
-- https://auracojewelry.com/product grid (migration 009 superseded)
--
-- Migration 009 was built from a bad extraction: querySelectorAll over
-- `a[href*="/product/"]` picked up the Necklaces/Bracelets/Earrings header
-- mega-menu's alphabetical link list (43px-tall rows, present in the DOM
-- but not the visible grid), not the actual product cards. That gave a
-- clean-looking but entirely wrong "category-grouped, alphabetical" order
-- that only coincidentally matched itself.
--
-- The real grid also paginates behind a "Show more" button (not scroll-
-- triggered), so a plain single-shot read undercounted it at 12-16 items.
-- This migration's order was read after clicking "Show more" until it
-- disappeared, then reading every product-card <h3> by its actual
-- on-screen top position — i.e. the order a visitor scrolling the page
-- actually sees, matching the FEATURED sort.
--
-- Same filtering as 009: the reference's 54 products are trimmed to the 45
-- slugs this catalog has, preserving relative order.
-- ============================================================================

UPDATE products SET sort_order = 1  WHERE slug = 'Pure-Alhambra';
UPDATE products SET sort_order = 2  WHERE slug = 'Audrey-Diamond-Hoops';
UPDATE products SET sort_order = 3  WHERE slug = 'Evermere-Heart-Necklace';
UPDATE products SET sort_order = 4  WHERE slug = 'The-Radiant-Flow-Tennis-Bracelet';
UPDATE products SET sort_order = 5  WHERE slug = 'Layered-Opal-Necklace';
UPDATE products SET sort_order = 6  WHERE slug = 'Everly-Knot-Bracelet';
UPDATE products SET sort_order = 7  WHERE slug = 'Celeste-Pav%C3%A9-Hoops';
UPDATE products SET sort_order = 8  WHERE slug = 'Luminary-Triple-Stone-Crawler';
UPDATE products SET sort_order = 9  WHERE slug = 'Elowen-Bloom-Necklace';
UPDATE products SET sort_order = 10 WHERE slug = 'The-Harmonious-Trio-Station-Necklace';
UPDATE products SET sort_order = 11 WHERE slug = 'Square-Pearl-Baya-Pendant-Necklace';
UPDATE products SET sort_order = 12 WHERE slug = 'Sweet-Alhambra-Pendant';
UPDATE products SET sort_order = 13 WHERE slug = 'Devotion-Screw-Motif-Necklace';
UPDATE products SET sort_order = 14 WHERE slug = 'The-Mediterranean-Keshi-Pearl-Station-Necklace';
UPDATE products SET sort_order = 15 WHERE slug = 'The-Eternal-Puffy-Heart-Necklace';
UPDATE products SET sort_order = 16 WHERE slug = 'Celestial-Journey-Stone-Necklace';
UPDATE products SET sort_order = 17 WHERE slug = 'The-Timeless-Green-Stone-Locket-Necklace';
UPDATE products SET sort_order = 18 WHERE slug = 'The-Graduated-Light-Station-Bracelet';
UPDATE products SET sort_order = 19 WHERE slug = 'The-Heritage-Rose-Tennis-Bracelet';
UPDATE products SET sort_order = 20 WHERE slug = 'The-Eternal-Bezel-Solitaire-Bracelet';
UPDATE products SET sort_order = 21 WHERE slug = 'The-Emerald-Tide-Station-Bracelet';
UPDATE products SET sort_order = 22 WHERE slug = 'Aura-&-CO';
UPDATE products SET sort_order = 23 WHERE slug = 'Sweet-Alhambra';
UPDATE products SET sort_order = 24 WHERE slug = 'The-Blooming-Flora-Charm-Bracelet';
UPDATE products SET sort_order = 25 WHERE slug = 'Sunlit-Cove-Charm-Bracelet';
UPDATE products SET sort_order = 26 WHERE slug = 'Sleek-Open-Cuff-Bangle-Bracelet';
UPDATE products SET sort_order = 27 WHERE slug = 'Nautilus-Flow-Statement-Bracelet';
UPDATE products SET sort_order = 28 WHERE slug = 'The-Harmony-Link-Bead-Bracelet';
UPDATE products SET sort_order = 29 WHERE slug = 'The-Solstice-Pyramid-Stone-Hoops';
UPDATE products SET sort_order = 30 WHERE slug = 'Sovereign-Dual-Tone-Huggies';
UPDATE products SET sort_order = 31 WHERE slug = 'Heritage-Triple-Ridge-Huggies';
UPDATE products SET sort_order = 32 WHERE slug = 'Ear-ssentials-Set';
UPDATE products SET sort_order = 33 WHERE slug = 'Madison-Pink-Sapphire-Dome-Huggies';
UPDATE products SET sort_order = 34 WHERE slug = 'Astoria-Diamond-Cue-Solitaire-Earrings';
UPDATE products SET sort_order = 35 WHERE slug = 'Montecito-Estate-Pearl-Earrings';
UPDATE products SET sort_order = 36 WHERE slug = 'Dot-Chain-Necklace';
UPDATE products SET sort_order = 37 WHERE slug = 'Luxe-Clover';
UPDATE products SET sort_order = 38 WHERE slug = 'Timeless-Elegance-Sparkle';
UPDATE products SET sort_order = 39 WHERE slug = 'Modern-Minimalist-Heart';
UPDATE products SET sort_order = 40 WHERE slug = 'Chic-Statement-Chain';
UPDATE products SET sort_order = 41 WHERE slug = 'Geometric-baguette-hoop-earrings';
UPDATE products SET sort_order = 42 WHERE slug = 'Aurelia-Fleur-Link-Earrings';
UPDATE products SET sort_order = 43 WHERE slug = 'The-Aurelia-Earrings';
UPDATE products SET sort_order = 44 WHERE slug = 'Elara-Sculpted-Hoops';
UPDATE products SET sort_order = 45 WHERE slug = 'The-Madison-Hoops';
