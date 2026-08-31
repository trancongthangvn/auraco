/**
 * Style fingerprint for reference-site parity work.
 *
 * Paste the IIFE below into the Chrome console (or run it through the
 * claude-in-chrome `javascript_tool`) on auracojewelry.com and on our staging
 * site, then diff the two JSON blobs. That turns "this looks different" into a
 * list of exact property mismatches, so parity work stops depending on
 * eyeballing screenshots.
 *
 * Two cautions learned the hard way:
 *   - The reference restyles its section titles once a band scrolls into view
 *     (`.home-section.is-visible .section__title` switches to weight 400), so
 *     the snippet scrolls the page before sampling. Measure the settled state,
 *     not the first paint.
 *   - A browser window with no size reports zeroes for every layout value.
 *     Anything derived from getBoundingClientRect is therefore reported
 *     alongside `viewport`; if that is 0, trust only the font/colour values.
 */

// eslint-disable-next-line no-unused-vars
const PARITY_FINGERPRINT = `(async () => {
  const PROPS = [
    "fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight",
    "textTransform", "color", "backgroundColor", "borderRadius", "boxShadow",
    "maxWidth", "padding", "margin", "display", "gap", "justifyContent",
  ];

  // Scroll through the page so scroll-triggered styles settle, then return.
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 40));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));

  const sample = (label, selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const out = { label, matched: sel };
      for (const p of PROPS) out[p] = cs[p];
      out.text = (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40);
      return out;
    }
    return { label, missing: true };
  };

  return JSON.stringify({
    viewport: window.innerWidth,
    items: [
      sample("headerShell", [".site-header__inner", "header > div"]),
      sample("logo", [".site-header__logo", 'header a[aria-label="AURA & CO"]']),
      sample("navLink", [".site-nav a", "header nav a"]),
      sample("sectionTitle", [".section__title", "h2.section-title"]),
      sample("homeBlock", [".home-section", ".home-block"]),
      sample("railCaption", [".home-brand-card span", '[aria-label="Shop by category"] a span:last-child']),
      sample("productName", [".shop-product-card__title", 'a[href^="/product/"] h3']),
      sample("productPrice", [".shop-product-card__price", 'a[href^="/product/"] p:last-child']),
      sample("footerHeading", [".site-footer h3", "footer h3"]),
      sample("footerLink", [".site-footer a", "footer a"]),
    ],
  });
})()`;

module.exports = { PARITY_FINGERPRINT };

/* ---------------------------------------------------------------------------
 * Reference baseline, auracojewelry.com homepage at a 1241px content width,
 * measured 2026-08-29 with every section forced into its `is-visible` state:
 *
 *   hero 698 | brands 371 | certificates 136 | collections 806 | new 1684
 *   videos 667 | reviews 676 | service-band 193 | stories 166 | journal 985
 *
 * Two of those are the reference's own broken assets, not a target to hit:
 * `--certificates` (press logos are 0x0 on the live site; the spec is
 * max-height 80px) and `--stories` (the IT-Girl artwork is 0x0). Our working
 * versions of both are legitimately taller.
 *
 * Shared metric every `.home-section` uses: padding 25.12px 24px, margin
 * 28.8px 0. Put it on the section element itself — wrapping the block in an
 * extra <section> keeps those margins inside the measured box and inflates the
 * band by ~57px against the reference.
 *
 * Three font families, not two: Cormorant Garamond (display), Jost (UI: nav,
 * prices, materials, review quotes, trust-band labels, journal meta), and
 * Source Sans 3 (body copy). Anything sans that is not explicitly Jost will
 * silently fall back to Source Sans 3 and read wrong.
 * ------------------------------------------------------------------------- */
