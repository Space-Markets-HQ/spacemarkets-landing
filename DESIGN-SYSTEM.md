# Space Markets — Design System

Reference for building `markets.spacemarkets.com` (and any other Space Markets surface) so it reads as the same product as the landing site (`spacemarkets-landing`). The landing site keeps styles inline in `components/SpaceMarketsHome.tsx` with base rules in `app/globals.css`; this doc extracts the system behind them.

**The feel in one line:** a dark, cinematic mission-control aesthetic — near-black space background, thin hairline borders, glassy panels, big light-weight display type, and small uppercase monospace data labels. Financial precision meets orbital imagery.

---

## 1. Color

### Core palette

| Token | Value | Use |
|---|---|---|
| `--sm-bg` | `#03070B` | Page background, theme color, scrim base. Everything sits on this. |
| `--sm-bg-deep` | `#071421` | Placeholder background behind imagery (media frames). |
| `--sm-text` | `#F5F8FF` | Primary text, headings, icons. Never pure white. |
| `--sm-text-muted` | `#8E99AA` | Secondary text, labels, nav links, captions. The default for anything non-primary. |
| `--sm-blue` | `#0B6BFF` | Primary action color. Buttons/CTAs only. |
| `--sm-cyan` | `#20D9FF` | Interactive accent: link hover, focus rings, charts, gradient endpoint, selection. |
| `--sm-green` | `#23E6A8` | Positive: "Yes" side, gains, live/available indicators. |
| `--sm-red` | `#FF4D5E` | Negative: "No" side, losses. |
| `--sm-orange` | `#FF9D3B` | Rare warm accent: marker dots, occasional twinkle glow. Use sparingly. |
| `--sm-star` | `#CFE0FF` | Star-field dots in hero backgrounds. |

`#0052FF` (Coinbase blue) appears once, only for the "Backed by Coinbase Ventures" wordmark — it is not a brand color.

### Signature gradient

Hero display text uses a text-clipped gradient:

```css
background: linear-gradient(to right, #20D9FF, #0B6BFF);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

### Borders & surfaces (white/black alpha ramp)

Almost every border is a 1px white-alpha hairline; almost every surface is a black-alpha glass. Stick to these steps:

| Use | Value |
|---|---|
| Subtle divider (card footers) | `rgba(255,255,255,0.08)` |
| Standard divider / list rows / footer top | `rgba(255,255,255,0.10)` |
| Card border | `rgba(255,255,255,0.12)` |
| Badge / media-frame border | `rgba(255,255,255,0.15)` |
| Card border on hover | `rgba(255,255,255,0.22)` |
| Subtle fill (buttons at rest, hover row) | `rgba(255,255,255,0.04)` |
| Input fill | `rgba(255,255,255,0.05)` |
| Badge/pill surface | `rgba(3,7,11,0.70)` |
| Card surface (glass) | `rgba(3,7,11,0.78)` |
| Scrolled nav surface | `rgba(3,7,11,0.80)` |
| Card surface on hover | `rgba(3,7,11,0.90)` |
| Modal panel | `rgba(3,7,11,0.95)` |
| Full-screen overlay (mobile menu) | `rgba(3,7,11,0.96)` |

### Semantic tints (green/red)

Yes/No and delta chips derive backgrounds/borders from the semantic color at fixed alphas:

- Chip/border resting: `rgba(35,230,168,0.30)` / `rgba(255,77,94,0.30)`
- Selected border: `…0.65`; hover border: `…0.60`
- Selected fill: `…0.16`; hover fill: `…0.14`; chip fill: `…0.10`
- Chart area fill: `…0.12`

### Misc

- Text selection: `::selection { background: rgba(32,217,255,0.25); color: #F5F8FF; }`
- Primary button glow: `box-shadow: 0 0 28px rgba(11,107,255,0.35)`

---

## 2. Typography

Three families, three jobs. On the landing site they're self-hosted woff2 subsets (`public/fonts/`); on a new Next.js site use `next/font/google` with the same families and weights.

| Family | Weights | Role |
|---|---|---|
| **Inter** | 400, 500 | Body copy, UI text, buttons, nav. The default (`font-family: 'Inter', ui-sans-serif, system-ui, sans-serif`). |
| **Space Grotesk** | 300–500 (variable) | Display headlines and feature titles. Weight **300** for section headlines, **400** for the hero. Always tight tracking. |
| **JetBrains Mono** | 400, 500 | Data and micro-labels: eyebrows, tickers, prices, timestamps, form labels, footer column heads. |

### Display (Space Grotesk)

- Tracking scales with size: `-0.02em` at small display sizes up to `-0.045em` at the largest.
- Line-height `0.98`–`1.05` (large headings sit tight).
- Headlines are sentence case and usually end with a period: *"Price the events that shape orbit."*
- Constrain width with `max-width` in `ch` (`10ch`–`15ch`) rather than fixed px.

| Level | Size | Weight / spacing |
|---|---|---|
| Hero h1 | `clamp(44px, 5.5vw, 78px)` | 400, `-0.02em`, lh 1.02 |
| Section h2 (large) | `clamp(38px, 4.8vw, 64px)` | 300, `-0.045em`, lh 0.98 |
| Section h2 (standard) | `clamp(38px, 4.3vw, 58px)` | 300, `-0.04em`, lh 0.98 |
| Statement h2 (widescreen) | `clamp(44px, 6vw, 82px)` | 300, `-0.04em`, lh 0.98 |
| Card / feature h3 | `22–30px` | 300, `-0.02em` to `-0.025em` |
| FAQ question | `20px` | 400, `-0.01em` |

### Body (Inter)

- Hero subline: `18px`, muted, `line-height: 1.65`, `max-width: 40ch`
- Section intro: `16–17px`, muted, lh 1.65, `max-width: 46–62ch`
- Card body / list rows: `14px`, lh 1.6
- Small print: `12px`
- Use `text-wrap: pretty` on paragraphs.

### Data & labels (JetBrains Mono)

The system's signature. Small, uppercase, widely tracked:

- Eyebrow/badge: `10px`, `letter-spacing: 0.22em`, uppercase, muted
- Caption/meta: `11px`, `0.18em`, uppercase
- Card meta (category, volume, resolves): `9px`, `0.14–0.2em`, uppercase
- Tiny meta (dl labels): `8px`, `0.12–0.15em`, uppercase
- Numbers always get `font-variant-numeric: tabular-nums`
- Big stat numbers are mono too: card probability `34px` / `-0.04em`; index value `clamp(88px, 9vw, 148px)` / `-0.055em`, weight 500

---

## 3. Layout & spacing

- **Containers:** `max-width: 1280px` for main sections, `1152px` for narrow sections (FAQ, CTA card, footer), `1440px` for the full-bleed hero grid. Centered with `margin: 0 auto`.
- **Page gutters:** `40px` desktop → `20px` mobile (`24px` for hero/CTA card padding).
- **Section rhythm:** vertical gap between sections is `margin-top: clamp(96px, 10vw, 120px)`; the FAQ uses a slightly larger `clamp(104px, 11vw, 140px)`.
- **Grid gaps:** `20px` between cards, `48px` between two-column layouts, `80px` for the FAQ split.
- **Card grids:** `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` (240px min for smaller cards).
- **Two-column editorial splits:** asymmetric fractions like `1.1fr 0.9fr`, `0.95fr 1.05fr`, `0.75fr 1.25fr` — never 50/50 unless it's the SMI plate.
- **Anchors:** `scroll-behavior: smooth; scroll-padding-top: 96px` (72px mobile).

### Breakpoints

| Range | Behavior |
|---|---|
| ≤ 900px | Mobile: single column everywhere, burger nav, centered hero, gutters 20px |
| 901–1280px | Mid-band: fixed-width columns go fluid (`1fr 1fr`) |
| > 1280px | Full desktop layout |

---

## 4. Radii

| Element | Radius |
|---|---|
| Buttons (primary/pill), badges, chips | `999px` (full pill) |
| Cards, modal panel, CTA card | `16px` |
| Inputs | `12px` |
| Yes/No trade buttons | `10px` |
| Dots, play button, orbs | `50%` |
| Full-bleed media frames | `0` — sharp corners with a 1px `rgba(255,255,255,0.15)` border |

---

## 5. Components

### Primary button (CTA)

Pill, solid blue, soft glow, arrow glyph:

```
display: inline-flex; align-items: center; gap: 8px;
border-radius: 999px; background: #0B6BFF; color: #F5F8FF;
font: 500 14px 'Inter'; padding: 13px 26px; min-height: 44px;
box-shadow: 0 0 28px rgba(11,107,255,0.35);
transition: filter 0.2s;        /* hover: filter: brightness(1.1) */
```

External/forward CTAs append `↗` (external) or `→` (in-page) in a `<span aria-hidden>`. Nav variant is `13px` with `padding: 10px 20px`.

### Light button (on-dark submit)

Same pill geometry, `background: #F5F8FF; color: #03070B`; hover swaps background to `#20D9FF`.

### Ghost/text button

No border or background; `500 14px Inter` at `rgba(245,248,255,0.9)`; hover → `#20D9FF`. Still `min-height: 44px`.

### Eyebrow badge ("Plate" label)

Every section opens with one:

```
display: inline-flex; border: 1px solid rgba(255,255,255,0.15);
border-radius: 999px; background: rgba(3,7,11,0.7); padding: 8px 14px;
font: 10px 'JetBrains Mono'; letter-spacing: 0.22em; text-transform: uppercase;
color: #8E99AA;
```

Content convention: `Plate 02 — Event Markets` (number + em-dash + label). Add `backdrop-filter: blur(4px)` when it sits over a photo.

### Glass card (market card, feature card)

```
border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
background: rgba(3,7,11,0.78); backdrop-filter: blur(16px);
padding: 22px;
transition: border-color 0.2s, background 0.2s;
/* hover: border-color rgba(255,255,255,0.22); background rgba(3,7,11,0.9) */
```

Card anatomy (market card): mono meta row (category / volume) → question in Inter 500 15px → big mono stat + sparkline → Yes/No buttons → hairline-topped mono footer.

### Yes / No trade buttons

```
flex: 1; min-height: 44px; border-radius: 10px;
font: 13px 'JetBrains Mono'; letter-spacing: 0.06em; tabular-nums;
transition: all 0.15s;
/* Yes: color #23E6A8 · No: color #FF4D5E */
/* rest:     border rgba(255,255,255,0.12), bg rgba(255,255,255,0.04) */
/* selected: border {color}0.65, bg {color}0.16 */
/* hover:    border {color}0.60, bg {color}0.14 */
```

Label format: `YES 64¢` / `NO 36¢`.

### Delta chip

Pill, mono 12px, tabular-nums; color/border/bg from the semantic ramp (`{green|red}` at 1 / 0.3 / 0.1). E.g. `+2.4%`.

### Data rows / index lists

Numbered editorial lists with hairline dividers (`1px solid rgba(255,255,255,0.10)` top and bottom of the block, and between rows):

- Grid: `2.5–3.5rem` mono index column → content → right-aligned mono meta
- Index numbers `01 02 03…` in mono 10–12px muted
- Interactive rows highlight with `background: rgba(255,255,255,0.04)` and ticker color → `#20D9FF`

### Inputs

```
border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
background: rgba(255,255,255,0.05); padding: 12px 16px;
color: #F5F8FF; font: 14px 'Inter'; outline: none;
/* focus: border-color rgba(32,217,255,0.5) */
```

Labels above: mono 11px, `0.18em` tracking, uppercase, muted. On mobile force `font-size: 16px` (iOS zoom-on-focus).

### Modal

Overlay: `rgba(3,7,11,0.8)` + `blur(12px)`, click to dismiss, Escape closes. Panel: `max-width: 480px`, radius 16, `rgba(3,7,11,0.95)` + `blur(24px)`, hairline header row with a mono uppercase title and a 44×44 `×` button.

### Nav

Fixed, full-width. Transparent at top; after ~12px of scroll: `background: rgba(3,7,11,0.8); border-bottom: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px)`, transitioning at 0.3s. Links are Inter 13px muted → light on hover. Logo `28px` tall (22px mobile). Mobile: burger (two right-aligned 1.5px bars) opens a full-screen overlay with Space Grotesk 300 32px links and the CTA pinned to the bottom.

### Charts / sparklines

- Line: `1.5px` stroke, `vector-effect: non-scaling-stroke`, round caps
- Color by direction: green `#23E6A8` up, red `#FF4D5E` down; hero index chart always cyan `#20D9FF`
- Area fill under the line: flat `{color}/0.12` on cards; vertical gradient `0.22 → 0` opacity for the big chart
- Axis labels: mono 10px uppercase tracked (`T-30D` / `NOW`)

### Imagery

Full-bleed orbital photography (Earth at night, ISS, launches) behind content. Always sandwiched with `#03070B`-based gradient scrims so it melts into the page background — e.g. `linear-gradient(to bottom, rgba(3,7,11,0.5), transparent 30%, rgba(3,7,11,0.92) 85%, #03070B)`. Photos in frames get the deep background `#071421` behind them, sharp corners, 1px hairline border. Decorative star fields are tiny `radial-gradient` dots of `#CFE0FF` at 0.35–0.55 opacity.

---

## 6. Motion

| Animation | Spec |
|---|---|
| Scroll reveal | `opacity 0 → 1`, `translateY(28px) → 0`, `0.9s cubic-bezier(0.22, 1, 0.36, 1)`, triggered by IntersectionObserver (`rootMargin: 0 0 -12%`); stagger siblings by `0.06–0.1s` via `animation-delay` |
| Hero entrance | Same rise, `0.7s ease-out` on load |
| Pulse (live dot) | opacity `1 → 0.35 → 1`, `2.4s ease-in-out infinite` |
| Twinkle (stars) | opacity `0.2 → 1` + scale `0.85 → 1`, `3.6–5.4s` staggered |
| Hover transitions | `0.15s` (trade buttons), `0.2s` (cards, color/filter), `0.3s` (nav) |
| Image zoom | `transform: scale(1.03)` over `6s ease-out` (film poster) |

Rules: content must be visible without JS (reveal classes only apply once JS adds a root class). Honor `prefers-reduced-motion: reduce` — disable reveals, twinkles, and any live data jitter entirely.

---

## 7. Accessibility & conventions

- Tap targets: every interactive element gets `min-height: 44px` (and 44×44 for icon buttons).
- Hover states on everything interactive; focus style on inputs (cyan border).
- `aria-label` on icon-only buttons, `aria-hidden` on decorative glyphs/arrows, `role="dialog" aria-modal` on overlays, alt text on photography.
- Numbers: always tabular-nums, always mono.
- Separators in labels: middot with spaces (`USDC / Base`, `00:34 · Sound on`, `Slots · downmass`).
- Illustrative data is always flagged (`† illustrative data` link in mono).
- Viewport theme color: `#03070B`.

---

## 8. Starter tokens (CSS custom properties)

```css
:root {
  /* color */
  --sm-bg: #03070B;
  --sm-bg-deep: #071421;
  --sm-text: #F5F8FF;
  --sm-text-muted: #8E99AA;
  --sm-blue: #0B6BFF;
  --sm-cyan: #20D9FF;
  --sm-green: #23E6A8;
  --sm-red: #FF4D5E;
  --sm-orange: #FF9D3B;

  /* borders & surfaces */
  --sm-line-subtle: rgba(255,255,255,0.08);
  --sm-line: rgba(255,255,255,0.10);
  --sm-line-card: rgba(255,255,255,0.12);
  --sm-line-strong: rgba(255,255,255,0.15);
  --sm-line-hover: rgba(255,255,255,0.22);
  --sm-fill-subtle: rgba(255,255,255,0.04);
  --sm-fill-input: rgba(255,255,255,0.05);
  --sm-surface-badge: rgba(3,7,11,0.70);
  --sm-surface-card: rgba(3,7,11,0.78);
  --sm-surface-card-hover: rgba(3,7,11,0.90);
  --sm-surface-modal: rgba(3,7,11,0.95);

  /* effects */
  --sm-glow-blue: 0 0 28px rgba(11,107,255,0.35);
  --sm-gradient-hero: linear-gradient(to right, #20D9FF, #0B6BFF);
  --sm-ease-reveal: cubic-bezier(0.22, 1, 0.36, 1);

  /* type */
  --sm-font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --sm-font-display: 'Space Grotesk', sans-serif;
  --sm-font-mono: 'JetBrains Mono', monospace;

  /* radii */
  --sm-radius-pill: 999px;
  --sm-radius-card: 16px;
  --sm-radius-input: 12px;
  --sm-radius-trade: 10px;
}
```

If the markets site uses Tailwind, map these into `theme.extend` (colors, borderRadius, fontFamily, boxShadow) rather than hand-writing values — the exact hex/alpha steps above are the contract.

---

## 9. Quick do / don't

**Do**
- Keep everything on `#03070B`; blend imagery into it with scrims.
- Use mono for every number, label, and unit; sentence-case Space Grotesk 300 for headlines.
- Use 1px white-alpha hairlines for all structure; glass (black-alpha + blur) for elevated surfaces.
- Reserve `#0B6BFF` for actions and `#20D9FF` for hover/focus/data accents.
- End headlines with a period.

**Don't**
- No pure white (`#FFFFFF` text) or pure black surfaces.
- No heavy font weights in display type (nothing above 500 anywhere except the one Coinbase wordmark).
- No drop shadows for elevation — elevation is border + backdrop blur; the only shadow is the blue CTA glow.
- No rounded corners on photography frames; no borders thicker than 1px.
- Don't animate anything for users with reduced motion enabled.
