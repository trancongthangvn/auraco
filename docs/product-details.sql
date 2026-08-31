-- Adds a nullable details_html column to products and populates it with
-- real per-product "Details" panel content (structured Details & Fit bullets
-- + a How To Style It paragraph), matching the accordion structure on the
-- reference site https://auracojewelry.com/product/<slug>.
--
-- Facts (metal, fit/size, chain/bracelet length, carat weight, etc.) were
-- read directly off each reference product page and are reproduced as-is —
-- they are product specifications, not copyrightable prose. The "How To
-- Style It" paragraphs are written from scratch in our own words (same
-- meaning/intent, different sentences) per this project's standing rule
-- against copying the reference site's marketing prose verbatim (see
-- DEPLOYMENT.md "Reference-site parity: decisions on record" — legal copy
-- and other prose is structure-matched only, never copied). Two products
-- also skip the reference paragraph outright because the reference site's
-- own copy is mismatched/buggy there (points at a different product):
-- The-Eternal-Bezel-Solitaire-Bracelet (references "Triple Stone Stud
-- Earrings") and Aura-&-CO (references "Molten Snow Diamond Hoops"). We do
-- not replicate their bugs (same policy as the ToS-duplicates-returns bug
-- noted in DEPLOYMENT.md).

ALTER TABLE products ADD COLUMN IF NOT EXISTS details_html TEXT;

UPDATE products SET details_html = v.html FROM (VALUES

('Evermere-Heart-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18ct Gold Vermeil<br>
✦ Pendant Height: 1.6cm, Width: 1.3mm<br>
✦ Fit Guidance: Necklace circumference adjustable between 41-46cm (16"-18")</p>
<p><strong>How To Style It:</strong> <br>
A romantic everyday layering piece. Wear it alone for a soft focal point, or add it to a stack of finer chains for extra dimension.</p>$$),

('Pure-Alhambra', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Mother of Pearl<br>
✦ 4 motifs<br>
✦ Bracelet Length: 16.5cm + 3.5cm extender<br>
✦ Motif Size: 13mm x 13mm</p>
<p><strong>How To Style It:</strong> <br>
Wear it on its own for understated polish, or stack it with slim gold bangles for a more layered look.</p>$$),

('Audrey-Diamond-Hoops', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Hoop Size: Small, 18mm diameter, 3mm thick, 17mm height<br>
✦ Weight: 4g</p>
<p><strong>How To Style It:</strong> <br>
These pavé hoops go from desk to dinner. Wear them solo with a simple top, or add small studs behind them for a fuller ear stack.</p>$$),

('The-Radiant-Flow-Tennis-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil over Sterling Silver<br>
✦ Length: 7" (17.7cm)<br>
✦ Closure: Box Clasp with Safety Latch<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
A sparkling everyday layer for the wrist. Wear it alone for a clean line of shine, or pair it with a plain band for contrast.</p>$$),

('Layered-Opal-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Opal<br>
✦ Fit Guidance: Adjustable from 15" to 17"<br>
✦ Chain Length: Total Length 17", adjustable from 15"</p>
<p><strong>How To Style It:</strong> <br>
A soft finishing touch for everyday wear. Layer it with thinner chains, or let it stand alone for a quiet glow.</p>$$),

('Celeste-Pav%C3%A9-Hoops', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil (2.5 micron) over Sterling Silver<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Size: Length 27.4mm, Width 7.3mm, Height 3.0mm</p>
<p><strong>How To Style It:</strong> <br>
Wear it solo for understated sparkle, or stack it with plain hoops and studs for a fuller, curated ear.</p>$$),

('Square-Pearl-Baya-Pendant-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Pearl<br>
✦ Pendant Height: 17.8mm<br>
✦ Pearl Size: 10mm x 10mm<br>
✦ Chain Length: Total 45cm, adjustable from 41cm<br>
✦ Weight: 3.7g</p>
<p><strong>How To Style It:</strong> <br>
A modern twist on a classic pearl pendant. Layer it with other fine chains to let the pearl take center stage.</p>$$),

('The-Timeless-Green-Stone-Locket-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Green Onyx<br>
✦ Pendant: Height 1.4cm, Width 1.1cm, Depth 0.8cm<br>
✦ Gemstone: Height 1cm, Width 0.7cm<br>
✦ Fit Guidance: Necklace circumference adjustable up to 43cm<br>
✦ Chain Width: 1.1mm</p>
<p><strong>How To Style It:</strong> <br>
A rich pop of green for everyday wear. Wear it alone as a focal point, or layer it under a blazer for a hint of color.</p>$$),

('The-Emerald-Tide-Station-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Gemstone: Emerald, five round stones, 0.40ct total<br>
✦ Fit Guidance: Fits wrists up to approximately 17.8cm<br>
✦ Chain Length: Total Length 17.8cm</p>
<p><strong>How To Style It:</strong> <br>
Let the row of emerald stations catch the light on its own, or wear it alongside a plain gold bangle for contrast.</p>$$),

('The-Solstice-Pyramid-Stone-Hoops', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Amazonite<br>
✦ Size: Mini hoops &amp; huggies, 11.5mm hoops, 10.7mm x 9.2mm charms, 3mm stone thickness<br>
✦ Weight: 2.3g</p>
<p><strong>How To Style It:</strong> <br>
A sculptural hoop for everyday wear, worn alone for a cleaner line or stacked with delicate huggies for more texture.</p>$$),

('Heritage-Triple-Ridge-Huggies', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Sterling Silver<br>
✦ Size: Height 16.2mm, Width tapers 5.2mm-8mm, Depth 2.2mm<br>
✦ Weight: 9.5g</p>
<p><strong>How To Style It:</strong> <br>
The warm, polished ridges add a quiet touch of texture to any outfit, easily worn from daytime through evening.</p>$$),

('Dot-Chain-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Fit Guidance: Adjustable from 16" to 18"<br>
✦ Chain Length: Total Length 18", adjustable from 16"</p>
<p><strong>How To Style It:</strong> <br>
A subtle everyday shimmer. Wear it on its own, or layer it in for a bit more dimension.</p>$$),

('Everly-Knot-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18K Yellow Gold (750/1000)<br>
✦ Stones: 48 brilliant-cut diamonds, 0.30 carat total<br>
✦ Fit Guidance: Adjustable chain length 16cm and 18cm<br>
✦ Motif: Length 19mm, Width 2.6mm</p>
<p><strong>How To Style It:</strong> <br>
Wear it alone for a quiet everyday shine, or pair it with a slim gold watch for a more finished look.</p>$$),

('Nautilus-Flow-Statement-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Gemstone: Diamond, 25 stones, 0.21ct, DEF quality, IF to VVS<br>
✦ Fit Guidance: Fits wrists up to 17.5cm<br>
✦ Chain Length: Total Length 17.5cm<br>
✦ Clasp: 18k Yellow Gold</p>
<p><strong>How To Style It:</strong> <br>
The fluid, sculpted links bring warmth to any outfit and move easily from everyday wear into evening.</p>$$),

('Sleek-Open-Cuff-Bangle-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold Vermeil<br>
✦ Center Stone: 0.70 carat round brilliant diamond<br>
✦ Size: 7" (17.7cm)<br>
✦ Closure: Open cuff, slides on<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
The open cuff slips on easily and wears well alone, letting the rose gold tone stand out through the day.</p>$$),

('The-Aurelia-Earrings', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Size: Length 55mm, Width 20mm, Height 1mm</p>
<p><strong>How To Style It:</strong> <br>
Wear them with a simple top for easy daytime polish, or pair with minimal gold jewelry for evening so the sculpted teardrop shape leads the look.</p>$$),

('The-Madison-Hoops', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: Rhodium Plated Sterling Silver, Cubic Zirconia<br>
✦ Closure: Lobster Clasp<br>
✦ Size: Length 90mm, Width 90mm, Height 90mm<br>
✦ Weight: 9g</p>
<p><strong>How To Style It:</strong> <br>
Wear them with a blazer or a simple knit for polished daytime style — they carry through just as easily to an evening dinner.</p>$$),

('The-Heritage-Rose-Tennis-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Pink Gemstone<br>
✦ Length: 6.5" standard + 1" extender<br>
✦ Closure: Box Clasp with Safety Latch<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
A soft pink sparkle for the wrist. Wear it alone, or stack it with a sleek watch for everyday polish.</p>$$),

('Chic-Statement-Chain', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil (2.5 micron) over Sterling Silver<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
A bold chain that carries its own statement. Wear it with a tailored blazer, or a simple tee for effortless everyday edge.</p>$$),

('Luxe-Clover', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil (2.5 micron) over Sterling Silver<br>
✦ Necklace Length: 16" signature chain + 2" extender<br>
✦ Bracelet Length: 6" chain + 1.5" extender<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
The clover motif works equally well solo or layered. Mix the necklace and bracelet together for a matched everyday set.</p>$$),

('Modern-Minimalist-Heart', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18K Gold Vermeil (necklace &amp; bracelet set)<br>
✦ Necklace: Pendant Height 1.6cm, Width 1.3mm; circumference adjustable 41-46cm (16"-18")<br>
✦ Bracelet: 48 brilliant-cut diamonds, 0.30 carat total; adjustable length 16cm/18cm; motif 19mm x 2.6mm</p>
<p><strong>How To Style It:</strong> <br>
A matching necklace-and-bracelet pairing for a coordinated, minimalist look. Wear both together, or separately, for everyday simplicity.</p>$$),

('Timeless-Elegance-Sparkle', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Necklace Metal: 18K white, rose, and yellow gold; 43 pavé diamonds, 0.29ct total; motif 8.7mm; chain adjustable 36cm/40cm<br>
✦ Earrings: 14K Yellow Gold, 1.50 carats total diamond weight, 20mm x 25mm, center diamond 2.5mm</p>
<p><strong>How To Style It:</strong> <br>
A coordinated necklace-and-earring set for special occasions. Wear the pieces together for a polished, put-together sparkle.</p>$$),

('Celestial-Journey-Stone-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Moonstone<br>
✦ Fit Guidance: Necklace circumference adjustable 41-46cm (16"-18")<br>
✦ Pendant: Height 1.9cm, Width 1.2cm, Depth 0.6cm<br>
✦ Note: our gemstones are genuine, natural stones, so color may vary</p>
<p><strong>How To Style It:</strong> <br>
Dress it up with tailored trousers and a blazer for daytime polish, or wear it with a simple slip dress and gold studs in the evening.</p>$$),

('Devotion-Screw-Motif-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold Vermeil<br>
✦ Stones: 43 brilliant-cut pavé diamonds, 0.29 carat total<br>
✦ Motif Diameter: 8.7mm<br>
✦ Chain: 18K Yellow Gold, adjustable 36cm/40cm</p>
<p><strong>How To Style It:</strong> <br>
A refined everyday sparkle. Wear it alone for a clean, understated look, or layer it with other fine chains.</p>$$),

('Elowen-Bloom-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold Vermeil, Cubic Zirconia<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Pendant: mini model, 18K rose gold, round diamonds, DEF quality, IF to VVS<br>
✦ Chain Length: 16"<br>
✦ Clasp: 18K Rose Gold</p>
<p><strong>How To Style It:</strong> <br>
Wear it alone for a refined, understated look, or layer it with other delicate pieces for a more personal mix.</p>$$),

('Sweet-Alhambra-Pendant', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold Vermeil, Cubic Zirconia<br>
✦ Pendant: textured 18K rose gold<br>
✦ Chain Length: 15.75"<br>
✦ Clasp: extra small hallmark clasp, 18K rose gold</p>
<p><strong>How To Style It:</strong> <br>
Let the rose gold and pink stone catch the light by keeping the rest of your outfit simple — think clean lines and neutral tones.</p>$$),

('The-Eternal-Puffy-Heart-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Pendant: Height 2cm, Width 1.2cm<br>
✦ Fit Guidance: Necklace circumference adjustable up to 43cm<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
Wear it with a plain tank and jeans for easy daytime style, or dress it up with tailored trousers for evening.</p>$$),

('The-Harmonious-Trio-Station-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Rhodium Plated, Cubic Zirconia<br>
✦ Stones: 43 brilliant-cut pavé diamonds, 0.29 carat total<br>
✦ Motif Diameter: 8.7mm<br>
✦ Chain: 18K Yellow Gold, adjustable 36cm/40cm</p>
<p><strong>How To Style It:</strong> <br>
Wear it solo with an open neckline to spotlight the pendant, or layer it with a plain chain for more depth.</p>$$),

('The-Mediterranean-Keshi-Pearl-Station-Necklace', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Keshi Pearl<br>
✦ Fit Guidance: Necklace circumference adjustable at 40.5cm, 43cm, or 45.5cm (16", 17", or 18")<br>
✦ Drop Distance: 3.75cm</p>
<p><strong>How To Style It:</strong> <br>
Pair it with a blazer and a simple camisole for a polished daytime look, finished with tailored trousers.</p>$$),

('Aura-&-CO', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold, round brilliant diamonds<br>
✦ Size: Medium, fits wrists up to 6.25" (14.6cm-15.9cm)<br>
✦ Carat Total Weight: 0.24</p>
<p><strong>How To Style It:</strong> <br>
A refined diamond-set bracelet for everyday wear. Pair it with smooth, minimal fabrics to let the stones stand out.</p>$$),

('Sunlit-Cove-Charm-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Rhodochrosite<br>
✦ Charm Size: 7.5mm x 5mm<br>
✦ Weight: 3.9g<br>
✦ Chain Length: 18.5cm, adjustable from 16cm</p>
<p><strong>How To Style It:</strong> <br>
The warm gold tone and soft pink charm add a bit of color to any outfit, worn easily from day into evening.</p>$$),

('Sweet-Alhambra', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold<br>
✦ Design: 6 textured motifs<br>
✦ Fit Guidance: Fits wrists up to approximately 17.5cm<br>
✦ Chain Length: Total Length 17.5cm<br>
✦ Clasp: Hallmark Clasp</p>
<p><strong>How To Style It:</strong> <br>
The textured rose gold links add a refined focal point to your everyday wardrobe, working equally well casual or dressed up.</p>$$),

('The-Blooming-Flora-Charm-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Gemstone: Diamond, 25 stones, 0.21ct, DEF quality, IF to VVS<br>
✦ Fit Guidance: Fits wrists up to 17.5cm<br>
✦ Chain Length: Total Length 17.5cm<br>
✦ Clasp: 18k Yellow Gold</p>
<p><strong>How To Style It:</strong> <br>
Let the diamond-set clover charm catch the light on bare skin, or wear it layered under a sleeve for a quieter sparkle.</p>$$),

('The-Eternal-Bezel-Solitaire-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Rose Gold<br>
✦ Gemstone: Diamond, five round brilliant diamonds, 0.35 carat total<br>
✦ Chain Length: Total Length 17.8cm</p>
<p><strong>How To Style It:</strong> <br>
The line of bezel-set diamonds sits close to the wrist for an everyday, understated sparkle.</p>$$),

('The-Graduated-Light-Station-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil (2.5 micron) over Sterling Silver, natural gemstone beads<br>
✦ Length: 6.5" (16.5cm) signature chain + 1.5" extender<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
The graduated stone beads add gentle color and texture to the wrist, easy to wear on its own every day.</p>$$),

('The-Harmony-Link-Bead-Bracelet', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 14K Yellow Gold<br>
✦ Chain Length: 6"-6.5"-7" adjustable<br>
✦ Diamond Weight: 0.20 carats<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
The warm gold links add a quiet touch of polish to your everyday pieces, day or night.</p>$$),

('Astoria-Diamond-Cue-Solitaire-Earrings', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Cubic Zirconia (also available in 14K Yellow or White Gold)<br>
✦ Stone: White Topaz, 10mm<br>
✦ Length: 25mm<br>
✦ Sold as a pair</p>
<p><strong>How To Style It:</strong> <br>
The warm gold-tone finish pairs easily with your everyday pieces, adding a subtle touch of polish from morning to night.</p>$$),

('Aurelia-Fleur-Link-Earrings', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Pearl<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Size: Length 38mm, Width 11mm, Height 2.5mm</p>
<p><strong>How To Style It:</strong> <br>
Wear them alone with a simple blouse or fitted knit, or add a few delicate chains for a more layered, put-together look.</p>$$),

('Ear-ssentials-Set', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Sterling Silver, Cubic Zirconia<br>
✦ Includes: a curated set of 3 signature pairs<br>
✦ Closure: Butterfly Push-Backs &amp; Hinge Snag-Free Clasps<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic</p>
<p><strong>How To Style It:</strong> <br>
A ready-made trio for building your ear stack. Mix and match the three pairs for a different look each day.</p>$$),

('Elara-Sculpted-Hoops', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Closure: Lobster Clasp<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Size: Length 10mm, Width 70mm, Height 30mm</p>
<p><strong>How To Style It:</strong> <br>
Wear these classic gold hoops on their own for a clean look, or stack them with studs and huggies for a fuller ear. Easy with everyday denim, or dressed up for evening.</p>$$),

('Geometric-baguette-hoop-earrings', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Size: Hoop Height 3.5mm, Width 9mm, Depth 9mm<br>
✦ Weight: 21g</p>
<p><strong>How To Style It:</strong> <br>
Pair them with delicate chains or a sleek bracelet for an easy, polished look, or add pearls for a bit of contrast against the bold shape.</p>$$),

('Luminary-Triple-Stone-Crawler', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil<br>
✦ Closure: Butterfly Push-Backs<br>
✦ Care: 100% Waterproof, Tarnish-Free &amp; Hypoallergenic<br>
✦ Stone: Cubic Zirconia<br>
✦ Size: 13mm x 4.6mm<br>
✦ Weight: 2.2g</p>
<p><strong>How To Style It:</strong> <br>
For a bolder look, pair them with your favorite chunky hoops.</p>$$),

('Madison-Pink-Sapphire-Dome-Huggies', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Pink Sapphire (also available in 14K Yellow Gold)<br>
✦ Stone: Pink Sapphire, 0.53 carats<br>
✦ Inner Diameter: 9mm x 8mm<br>
✦ Sold as a pair</p>
<p><strong>How To Style It:</strong> <br>
The warm gold tone and soft pink stone pair easily with your everyday pieces, adding a bit of elegance from day to night.</p>$$),

('Montecito-Estate-Pearl-Earrings', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Pearl, Cubic Zirconia<br>
✦ Pearl: Mabe pearls, 12mm<br>
✦ Diamond Halo Weight: 0.42 carats<br>
✦ Button Size: 19mm</p>
<p><strong>How To Style It:</strong> <br>
The warm gold tone and pearl button pair easily with your everyday pieces, adding a subtle touch of polish from day to night.</p>$$),

('Sovereign-Dual-Tone-Huggies', $$<p><strong>Details &amp; Fit:</strong> <br>
✦ Metal: 18k Gold Vermeil, Rhodium Plated<br>
✦ Hoop Size: Small<br>
✦ Size: Diameter 15mm, Width 4.5mm<br>
✦ Weight: 4.4g</p>
<p><strong>How To Style It:</strong> <br>
A sculptural hoop for everyday wear, worn alone for a cleaner look or stacked with delicate huggies for more texture.</p>$$)

) AS v(slug, html) WHERE products.slug = v.slug;
