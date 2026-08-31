# Typography baseline — auracojewelry.com

The single set of numbers every parity change is measured against. Re-derive a
value only if you first show this table is wrong.

## Measurement base

Both sites must be compared under the same conditions, or every px figure below
is meaningless:

| | value |
|---|---|
| root font-size | **16px** (both sites) |
| devicePixelRatio | 1.5 |
| viewport width | 1256px |
| header/section shell | `max-width: 1200px` |

Verified identical on the reference and on staging, so CSS-px figures compare
one-to-one. Browser zoom changes what you *see* but not these numbers — when a
screenshot disagrees with a measurement, check zoom before changing code.

Two traps that invalidate a reading:

1. **Sections must be `is-visible`.** The reference restyles on scroll reveal
   (`.section__title` goes 37.6px/700 → 28px/400/uppercase). A background tab
   never fires the reveal. Force it:
   `document.querySelectorAll('.home-section,.reveal-on-scroll').forEach(s => s.classList.add('is-visible'))`
2. **Measure the leaf, not the wrapper.** Wrappers report inherited defaults.
   `.shop-product-card__title` reads 19px/500 sans; the real name is the `<a>`
   inside at 20px/400 Cormorant. `.site-header__logo` reads 21.6px/700; the
   wordmark is `.logo__name` at 27px/400.

## Font families

The reference declares four but **only loads two**: it has zero `@font-face`
for Jost and Bodoni Moda, so on the live site those fall back to the visitor's
default sans/serif (Arial on Windows), which renders ~10% wider than real Jost.
We load the real fonts deliberately — the design intent, and identical for every
visitor. Consequence: our nav row is ~10% narrower than theirs. Accepted.

| role | family | where |
|---|---|---|
| display | Cormorant Garamond | logo, section titles, product names, journal titles |
| UI | Jost | nav, prices, materials, review quotes, trust labels, footer, hero lede |
| tiles | Bodoni Moda | collection tile captions only |
| body | Source Sans 3 | inherited default; almost nothing sets it explicitly |

## Tokens

| element | size / weight | family | tracking | line-height | colour |
|---|---|---|---|---|---|
| logo wordmark | 27 / 400 | Cormorant | -0.405px | 27px | ink |
| nav link | 12 / 400 | Jost | 0.66px | 14.4px | `#2b261f` |
| section title (revealed) | 28 / 400 | Cormorant | 0.84px | — | `#28241f` |
| product name | 20 / 400 | Cormorant | normal | 23px | `#28241f` |
| product material | 12 / 400 | Jost | 0.12px | 16.8px | `#5f5a54` |
| product price | 12 / 300 | Jost | 0.12px | 16.8px | `#5f5a54` |
| category rail caption | 26 / 400 | Cormorant | normal | — | `#2b261f` |
| collection caption | 19 / 400 | **Bodoni Moda** | normal | 21.85px | `#28241f` |
| category feature title | 42 / 400 | Cormorant | — | 1.05 | white |
| category feature desc | 13 / 300 | Jost | 0.01em | 1.5 | `rgba(255,255,255,.94)` |
| hero title | 52 / 400 | Cormorant | 2.34px | 54.6px | white |
| hero lede | 15 / 400 | Jost | 1.125px | 22.2px | `rgba(255,255,255,.92)` |
| hero CTA | 12 / 400 | Jost | 1.2px | 12px | white |
| trust band label | 18.212 / 400 | Jost | 1.09272px | 21.85px | white |
| feedback name | 12 / 500 | Jost | — | 15.6px | `#28241f` |
| feedback date | 10 / 300 | Jost | — | 15.5px | `rgba(40,36,31,.45)` |
| feedback quote | 11 / 300 | Jost | — | 1.55 | `#4f4a44` |
| IT-Girl heading | 32 / 400 | Cormorant | normal | 1.25 | `#28241f` |
| IT-Girl body | 16 / 400 | Source Sans 3 | normal | — | `#2b261f` |
| journal date | 10 / 300 | Jost | — | 15.5px | `rgba(40,36,31,.52)` |
| journal title | 19.2 / 700 | Cormorant | — | 29.76px | `#2b261f` |
| journal excerpt | 12 / 300 | Jost | — | 18.6px | `#625d56` |
| journal read-more | 11 / 400 | Jost | — | 17.05px | `#8d6a37` |
| footer heading | 13.6 / 400 | Jost | 1.632px | 21.08px | `#a67c3d` |
| footer column link | 12 / 400 | Jost | 1.44px | 18.6px | `#5c554a` (uppercase) |
| footer consent text | 12 / 300 | Jost | 0.12px | 18px | `#6e6963` |
| footer consent link | 12 / 300 | Jost | 0.12px | 18px | `#2b261f` |

Corrected 2026-08-29: the single "footer link" row here previously carried the
consent line's inline-link values and was applied to the column nav, which is a
different, uppercase style. The three rows above are measured separately.

## Boxes

| | value |
|---|---|
| header bar | 64px tall, `padding: 12px 16px`, logo starts at x=36 |
| nav | 20px between items; caps centred on y=32 in the 64px bar |
| every home section | `padding: 25.12px 24px`, `margin: 28.8px 0`, on the section itself |
| category rail tile | 280×320, 4 columns |
| collection tile | 387×347, caption pad `16px 17.6px 18.4px` |
| feedback card | 193×579, photo **192×400** (portrait), body pad `19.2px 9.6px 11.2px`, gap 3.2px, row gutter 7px |
| journal card | 588×845, image 587×650, body pad `16px 17.6px 18.4px`, gutter 17px |
| video card | base `min(82vw,300px)` wide, clip 3/4 ratio (300×400 at base) |
| trust band | 3 columns, 37.68px gap, icons 50px white stroke |
| category feature | 16/7, body inset 1rem, desc capped 520px |
| IT-Girl / stories image | text column fixed 450px, image gets everything left over (not a 50/50 split), 16/9, radius 14px |

## Border radius

Checked 2026-08-30 across every home-section image after the IT-Girl one was
found missing its radius entirely. Don't re-derive without checking this list
first — most of these were already correct, only IT-Girl was wrong:

| element | radius |
|---|---|
| hero image | 0 (full-bleed) |
| category rail tile | 0 |
| product card image | 0 |
| collection tile | 12px |
| feedback card | 8px (photo: 8px top corners only) |
| journal card | 14px |
| video card (active/inactive) | 10px top corners only |
| category feature banner (Beach Vibe) | 0 |
| **IT-Girl / stories image** | **14px** — was 0 on our build, fixed |

Radius is inconsistently placed: sometimes on the `<img>` itself (IT-Girl,
feedback), sometimes on a wrapping wrapper with `overflow:hidden` (journal,
collections). Read the full ancestor chain, not just the image and its
immediate parent — a shallow check reads several of these as "0" when the
real clip is one or two levels further up.

## Stars

One glyph, two sizes. Both on a `0 0 24 24` viewBox with the path

```
M12 2l2.95 6.6 7.05.7-5.3 4.92 1.55 7.18L12 17.85 5.75 21.4 7.3 14.22 2 9.3l7.05-.7L12 2z
```

drawn **filled *and* stroked at 1.5px in the same colour** — the stroke is what
gives them their weight; without it they read thin and undersized.

| | box | gap | lit | unlit |
|---|---|---|---|---|
| feedback card | 12px | 0.8px | `#f0b429` | `#e0d5c0` |
| product card (reference) | 15px | — | `#f0b429` | outline |

Ours renders product-card stars at 19px, not 15px — a deliberate departure the
shop owner asked for.

## Section heights (reference, `is-visible`, viewport 1256)

```
hero 698 | brands 371 | certificates 136 | collections 806 | new 1684
videos 667 | reviews 676 | service-band 193 | stories 166 | journal 985
```

`certificates` and `stories` are shorter than ours only because the reference's
own press logos and IT-Girl artwork are broken (`naturalWidth === 0`). Do not
match those two by shrinking working images.
