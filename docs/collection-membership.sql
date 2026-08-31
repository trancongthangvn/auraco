-- Collection membership synced from the reference site's category pages.
-- Safe to re-run: memberships are replaced per collection, inserts ignore
-- products we do not carry.
BEGIN;

-- QUIET-LUXURY: 12 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'QUIET-LUXURY';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'QUIET-LUXURY' AND p.slug IN ('Audrey-Diamond-Hoops', 'The-Heritage-Rose-Tennis-Bracelet', 'The-Eternal-Bezel-Solitaire-Bracelet', 'Sweet-Alhambra', 'The-Blooming-Flora-Charm-Bracelet', 'The-Astoria-Baroque-Square-Studs', 'The-Eclipse-Wave-Gold-Earrings', 'The Luminary-Pearl-Drop-Hoops', 'Montecito-Estate-Pearl-Earrings', 'Geometric-baguette-hoop-earrings', 'The-Aurelia-Earrings', 'Aurelia-Fleur-Link-Earrings')
ON CONFLICT DO NOTHING;

-- MINIMALIST: 4 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'MINIMALIST';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'MINIMALIST' AND p.slug IN ('The-Solstice-Pyramid-Stone-Hoops', 'Heritage-Triple-Ridge-Huggies', 'The Lexington-Double-Pavé-Huggies', 'Elara-Sculpted-Hoops')
ON CONFLICT DO NOTHING;

-- STATEMENT: 3 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'STATEMENT';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'STATEMENT' AND p.slug IN ('The-Radiant-Flow-Tennis-Bracelet', 'Madison-Pink-Sapphire-Dome-Huggies', 'Astoria-Diamond-Cue-Solitaire-Earrings')
ON CONFLICT DO NOTHING;

-- TRENDING-NOW: 12 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'TRENDING-NOW';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'TRENDING-NOW' AND p.slug IN ('Celeste-Pavé-Hoops', 'Everly-Knot-Bracelet', 'Luminary-Triple-Stone-Crawler', 'Elowen-Bloom-Necklace', 'Nautilus-Flow-Statement-Bracelet', 'Sleek-Open-Cuff-Bangle-Bracelet', 'The-Harmony-Link-Bead-Bracelet', 'Ear-ssentials-Set', 'Luxe-Clover', 'Modern-Minimalist-Heart', 'Timeless-Elegance-Sparkle', 'Chic-Statement-Chain')
ON CONFLICT DO NOTHING;

-- BEACH-VIBE: 8 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'BEACH-VIBE';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'BEACH-VIBE' AND p.slug IN ('Pure-Alhambra', 'Layered-Opal-Necklace', 'The-Harmonious-Trio-Station-Necklace', 'Sweet-Alhambra-Pendant', 'The-Graduated-Light-Station-Bracelet', 'The-Emerald-Tide-Station-Bracelet', 'Sunlit-Cove-Charm-Bracelet', 'Sovereign-Dual-Tone-Huggies')
ON CONFLICT DO NOTHING;

-- BEST-SELLERS: 9 products
DELETE FROM product_collections pc USING collections c WHERE pc.collection_id = c.id AND c.slug = 'BEST-SELLERS';
INSERT INTO product_collections (product_id, collection_id)
SELECT p.id, c.id FROM products p CROSS JOIN collections c
WHERE c.slug = 'BEST-SELLERS' AND p.slug IN ('Evermere-Heart-Necklace', 'Square-Pearl-Baya-Pendant-Necklace', 'Devotion-Screw-Motif-Necklace', 'The-Eternal-Puffy-Heart-Necklace', 'The-Mediterranean-Keshi-Pearl-Station-Necklace', 'Celestial-Journey-Stone-Necklace', 'The-Timeless-Green-Stone-Locket-Necklace', 'Aura-&-CO', 'Dot-Chain-Necklace')
ON CONFLICT DO NOTHING;

COMMIT;
