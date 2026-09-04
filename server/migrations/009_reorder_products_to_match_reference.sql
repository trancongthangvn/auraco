-- ============================================================================
-- 009 — Reorder products to match auracojewelry.com/product
--
-- No schema change (products.sort_order already exists, migration 004) —
-- this is a one-time data fix. The reference site's "All Products" page
-- lists every product grouped by category (Necklaces, then Bracelets, then
-- Earrings, then Signature Sets), alphabetical by name within each group,
-- followed by a trailing block of newer "The ___" pieces in the reference's
-- own (non-alphabetical) order. Our own products.sort_order was never set
-- to reflect that, so /catalog, /product and every "featured" sort fell
-- back to created_at DESC (import order) instead — visibly different
-- ordering from the reference on the same page.
--
-- Values below were read directly off https://auracojewelry.com/product
-- (54 unique products there) and filtered down to the 45 slugs this catalog
-- actually has — 9 reference products (The Astor Sculpted Hoops, The
-- Astoria Baroque Square Studs, The Celeste Link Drop Earrings, The Eclipse
-- Wave Gold Earrings, The Hampton Huggies, The Luminary Pearl Drop Hoops,
-- The Margaux Textured Ear Cuff, The Lexington Double Pavé Huggies, The
-- Mayfair Contour Stone Huggies) aren't in our catalog yet and are simply
-- skipped, so the ones we do have keep the reference's relative order.
--
-- Matched by slug, not id, so this stays safe to re-run even if ids ever
-- differ between environments.
-- ============================================================================

UPDATE products SET sort_order = 1  WHERE slug = 'Celestial-Journey-Stone-Necklace';
UPDATE products SET sort_order = 2  WHERE slug = 'Devotion-Screw-Motif-Necklace';
UPDATE products SET sort_order = 3  WHERE slug = 'Dot-Chain-Necklace';
UPDATE products SET sort_order = 4  WHERE slug = 'Elowen-Bloom-Necklace';
UPDATE products SET sort_order = 5  WHERE slug = 'Evermere-Heart-Necklace';
UPDATE products SET sort_order = 6  WHERE slug = 'Layered-Opal-Necklace';
UPDATE products SET sort_order = 7  WHERE slug = 'Square-Pearl-Baya-Pendant-Necklace';
UPDATE products SET sort_order = 8  WHERE slug = 'Sweet-Alhambra-Pendant';
UPDATE products SET sort_order = 9  WHERE slug = 'The-Eternal-Puffy-Heart-Necklace';
UPDATE products SET sort_order = 10 WHERE slug = 'The-Harmonious-Trio-Station-Necklace';
UPDATE products SET sort_order = 11 WHERE slug = 'The-Mediterranean-Keshi-Pearl-Station-Necklace';
UPDATE products SET sort_order = 12 WHERE slug = 'The-Timeless-Green-Stone-Locket-Necklace';
UPDATE products SET sort_order = 13 WHERE slug = 'Aura-&-CO';
UPDATE products SET sort_order = 14 WHERE slug = 'Everly-Knot-Bracelet';
UPDATE products SET sort_order = 15 WHERE slug = 'Nautilus-Flow-Statement-Bracelet';
UPDATE products SET sort_order = 16 WHERE slug = 'Pure-Alhambra';
UPDATE products SET sort_order = 17 WHERE slug = 'Sleek-Open-Cuff-Bangle-Bracelet';
UPDATE products SET sort_order = 18 WHERE slug = 'Sunlit-Cove-Charm-Bracelet';
UPDATE products SET sort_order = 19 WHERE slug = 'Sweet-Alhambra';
UPDATE products SET sort_order = 20 WHERE slug = 'The-Blooming-Flora-Charm-Bracelet';
UPDATE products SET sort_order = 21 WHERE slug = 'The-Emerald-Tide-Station-Bracelet';
UPDATE products SET sort_order = 22 WHERE slug = 'The-Eternal-Bezel-Solitaire-Bracelet';
UPDATE products SET sort_order = 23 WHERE slug = 'The-Graduated-Light-Station-Bracelet';
UPDATE products SET sort_order = 24 WHERE slug = 'The-Harmony-Link-Bead-Bracelet';
UPDATE products SET sort_order = 25 WHERE slug = 'Astoria-Diamond-Cue-Solitaire-Earrings';
UPDATE products SET sort_order = 26 WHERE slug = 'Audrey-Diamond-Hoops';
UPDATE products SET sort_order = 27 WHERE slug = 'Aurelia-Fleur-Link-Earrings';
UPDATE products SET sort_order = 28 WHERE slug = 'Celeste-Pav%C3%A9-Hoops';
UPDATE products SET sort_order = 29 WHERE slug = 'Ear-ssentials-Set';
UPDATE products SET sort_order = 30 WHERE slug = 'Elara-Sculpted-Hoops';
UPDATE products SET sort_order = 31 WHERE slug = 'Geometric-baguette-hoop-earrings';
UPDATE products SET sort_order = 32 WHERE slug = 'Heritage-Triple-Ridge-Huggies';
UPDATE products SET sort_order = 33 WHERE slug = 'Luminary-Triple-Stone-Crawler';
UPDATE products SET sort_order = 34 WHERE slug = 'Madison-Pink-Sapphire-Dome-Huggies';
UPDATE products SET sort_order = 35 WHERE slug = 'Montecito-Estate-Pearl-Earrings';
UPDATE products SET sort_order = 36 WHERE slug = 'Sovereign-Dual-Tone-Huggies';
UPDATE products SET sort_order = 37 WHERE slug = 'Chic-Statement-Chain';
UPDATE products SET sort_order = 38 WHERE slug = 'Luxe-Clover';
UPDATE products SET sort_order = 39 WHERE slug = 'Modern-Minimalist-Heart';
UPDATE products SET sort_order = 40 WHERE slug = 'Timeless-Elegance-Sparkle';
UPDATE products SET sort_order = 41 WHERE slug = 'The-Aurelia-Earrings';
UPDATE products SET sort_order = 42 WHERE slug = 'The-Heritage-Rose-Tennis-Bracelet';
UPDATE products SET sort_order = 43 WHERE slug = 'The-Madison-Hoops';
UPDATE products SET sort_order = 44 WHERE slug = 'The-Solstice-Pyramid-Stone-Hoops';
UPDATE products SET sort_order = 45 WHERE slug = 'The-Radiant-Flow-Tennis-Bracelet';
