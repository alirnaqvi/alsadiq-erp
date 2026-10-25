# Al Sadiq Trust — Design System (for the Donor Management ERP)

Source: the Al Sadiq Trust website (`al-sadiq-hub`). This file describes its visual language so the ERP looks like the same organisation. **Follow this document for every screen. Do not invent new colours, fonts or button styles.**

## 1. Brand character
Dignified, calm, warm, trustworthy. A religious charitable trust in Islamabad, so: deep green, restrained gold, cream paper background, serif headings, generous whitespace, soft shadows. Never flashy, never neon, no gradients except the gold/green ones below, no emoji in the UI.

Bilingual: English primary, Urdu (Nastaliq, RTL) as a secondary label in gold or muted text. The trust name is **Al Sadiq Trust / الصادق ٹرسٹ**. Logo file: `logo.png` (round, used at 36–48px).

## 2. Tech stack of the reference site
Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui **new-york** style, `cssVariables: true`, base colour slate (overridden by the tokens below), icons from **lucide-react**, `class-variance-authority`, `tailwind-merge`, `tw-animate-css`. Dark mode via a `.dark` class. If the ERP uses Tailwind v3, keep the same values and map them in `tailwind.config` / shadcn CSS variables (HSL equivalents can be derived from the hex values).

## 3. Fonts
Load Amiri and Inter from Google Fonts. Self-host **Jameel Noori Nastaleeq** for Urdu (not available on Google Fonts):
`https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap`

| Role | Family | Use |
|---|---|---|
| Display | **Amiri** (serif, fallback Georgia) | All `h1–h4`, big stat numbers, brand name. Letter-spacing `-0.01em`. |
| Body / UI | **Inter** (fallback system-ui) | Everything else: tables, forms, buttons, nav. |
| Urdu | **Jameel Noori Nastaleeq** | Class `.urdu`: `line-height: 2; direction: rtl;`. |

Body uses `-webkit-font-smoothing: antialiased`. Numbers in tables and stats use `tabular-nums`. Form inputs are 16px (`text-base`) so iOS does not zoom on focus.

## 4. Colour tokens
OKLCH is the source of truth (copy these into CSS variables exactly). Hex is an approximation for tools that need it.

### Light (`:root`)
| Token | OKLCH | ≈Hex | Use |
|---|---|---|---|
| `--background` | `oklch(0.99 0.005 95)` | `#FDFCF8` | Page background (warm off-white) |
| `--foreground` | `oklch(0.18 0.02 160)` | `#0A140F` | Body text |
| `--card` / `--popover` | `oklch(1 0 0)` | `#FFFFFF` | Cards, dropdowns, dialogs |
| `--primary` | `oklch(0.38 0.09 155)` | `#07502C` | Brand green: headings, links, primary buttons, focus ring |
| `--primary-foreground` | `oklch(0.99 0.005 95)` | `#FDFCF8` | Text on green |
| `--primary-deep` | `oklch(0.28 0.08 155)` | `#003416` | **Sidebar, footer, dark sections, top utility bar** |
| `--secondary` | `oklch(0.95 0.02 95)` | `#F2EFE0` | Hover fill, subtle surfaces |
| `--muted` | `oklch(0.96 0.01 95)` | `#F4F2EA` | Table header background, disabled areas |
| `--muted-foreground` | `oklch(0.45 0.02 160)` | `#4C5951` | Secondary text, hints, placeholders (at 60% opacity) |
| `--accent` | `oklch(0.78 0.13 85)` | `#DDB049` | Accent gold |
| `--gold` | `oklch(0.74 0.135 80)` | `#D7A035` | Signature gold: Urdu text on dark, icons, dividers, active nav |
| `--gold-foreground` | `oklch(0.18 0.02 160)` | `#0A140F` | Text on gold |
| `--cream` | `oklch(0.97 0.015 90)` | `#F9F5EA` | Alternate section background, info chips |
| `--destructive` | `oklch(0.55 0.22 27)` | `#D40C1A` | Errors, void/delete |
| `--border` | `oklch(0.9 0.02 95)` | `#E2DED0` | All borders and dividers |
| `--input` | `oklch(0.92 0.015 95)` | `#E7E5DA` | Input borders |
| `--ring` | `oklch(0.38 0.09 155)` | `#07502C` | Focus ring |

### Dark (`.dark`)
`--background oklch(0.15 0.02 160)` · `--foreground oklch(0.97 0.01 95)` · `--card/--popover oklch(0.2 0.025 160)` · `--primary oklch(0.55 0.1 155)` · `--primary-foreground oklch(0.99 0 0)` · `--primary-deep oklch(0.42 0.09 155)` · `--secondary/--muted oklch(0.25 0.02 160)` · `--muted-foreground oklch(0.7 0.02 95)` · `--cream oklch(0.22 0.02 160)` · `--border/--input oklch(0.3 0.02 160)` · `--ring oklch(0.55 0.1 155)`. Accent, gold and gold-foreground are unchanged.

### Gradients and shadows
```css
--gradient-gold:  linear-gradient(135deg, oklch(0.78 0.135 80), oklch(0.65 0.13 70));   /* money button */
--gradient-green: linear-gradient(135deg, oklch(0.38 0.09 155), oklch(0.28 0.08 155));
--gradient-hero:  linear-gradient(135deg, oklch(0.28 0.08 155 / 0.85), oklch(0.38 0.09 155 / 0.7));
--shadow-card:    0 2px 10px -2px oklch(0.18 0.02 160 / 0.08);     /* default card */
--shadow-elegant: 0 10px 40px -10px oklch(0.28 0.08 155 / 0.25);   /* dropdowns, featured panels */
--shadow-gold:    0 8px 30px -8px oklch(0.74 0.135 80 / 0.4);      /* gold button */
```

## 5. Shape, spacing, motion
- Base radius `--radius: 0.5rem`. Scale: `sm = r-4px`, `md = r-2px`, `lg = r`, `xl = r+4px`, `2xl = r+8px`.
- Buttons and inputs: `rounded-lg` (0.5rem). Cards and panels: `rounded-xl` / `rounded-2xl`. Badges and chips: `rounded-full`. Logo: `rounded-full`.
- Page container: `max-width: 80rem; padding-inline: 1.25rem; margin-inline: auto` (`.container-page`).
- Section padding: `4rem` vertical, `6rem` from `md` up.
- Borders are always 1px `--border` (outline button uses 1.5px primary). Dividers between table rows: 1px `--border`.
- Transitions: 200ms colour/background changes; 300ms for nav height/dropdowns (`ease-out`). Hover lift on the gold button: `translateY(-2px)` plus a stronger gold shadow. Dropdowns fade and slide down 8px. Respect reduced motion.
- Focus: inputs get `border-primary` + `ring-4 ring-primary/15`; other controls `ring-1 ring-ring`.

## 6. Component recipes

### Buttons
| Variant | Style | When |
|---|---|---|
| **Gold (`btn-gold`)** | `--gradient-gold` background, `--gold-foreground` text, weight 600, padding `0.75rem 2rem`, radius `--radius`, `--shadow-gold`, hover lifts 2px | **Reserved for the money action only** (donate / record collection / issue receipt). Compact: `text-sm py-2 px-4`. |
| **Outline (`btn-outline`)** | transparent, text `--primary`, `1.5px solid --primary`, weight 600, hover fills primary with `--primary-foreground` text | Secondary actions: view, export, submit forms, cancel |
| shadcn `default` | `bg-primary text-primary-foreground shadow hover:bg-primary/90`, `h-9 px-4` | In-table and dialog actions |
| `destructive` | `bg-destructive text-destructive-foreground` | Void, delete |
| `secondary` / `ghost` / `link` | shadcn defaults using the tokens above | Minor actions |
Rule: if everything is gold, gold means nothing. One gold button per screen at most.

### Cards and panels
- Standard card: `bg-card border border-border rounded-xl` (or `rounded-2xl` for large) + `--shadow-card`.
- Feature / key-facts panel: `bg-primary text-primary-foreground rounded-xl p-6 shadow-elegant`; Urdu caption in gold above an Amiri title; `<dt>` labels in gold, uppercase, `text-xs tracking-wide`; items separated by `border-primary-foreground/15`.
- Tinted callouts: green `bg-primary/5 border-primary/20`, gold `bg-gold/10 border-gold/40`, both `rounded-xl p-5`, title in Amiri bold.

### Stats strip (use for dashboard KPIs)
One bordered row: `grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border rounded-2xl overflow-hidden bg-card shadow-card`. Each cell `p-6 text-center`: value in Amiri `text-3xl md:text-4xl font-bold text-primary tabular-nums`, label `text-sm font-semibold`, detail `text-xs text-muted-foreground`.

### Admin shell (ERP layout)
- **Sidebar**: `bg-primary-deep`, text `primary-foreground/80`, width ~260px. Top: round logo (44px) + "Al Sadiq Trust" in Amiri bold white + Urdu name in gold. Nav items: icon (lucide, 18px) + label, `px-3 py-2.5 rounded-lg font-medium`; hover `bg-white/10`; **active item text `--gold`** with `bg-white/10`. Footer note small at 70% opacity. Collapses to a top strip or drawer on mobile.
- **Top bar / utility bar**: `bg-primary-deep` with `text-xs`, or on light pages `bg-background/95 backdrop-blur border-b border-border shadow-sm`.
- **Page header**: Amiri `text-3xl font-bold text-primary`, one line of muted description beneath. Optional Urdu title in gold above it.
- **Content area**: `bg-background`; alternate bands use `bg-cream`.
- Breadcrumbs: `text-xs`, muted, `ChevronRight` separators, current page in medium weight.
- Mobile drawer: full-width panel, `bg-background`, backdrop `bg-black/40`, accordion groups with a left `border-l-2 border-border` rail.

### Tables
Header row `bg-muted`, `text-xs uppercase tracking-wider text-muted-foreground`, cell padding `px-5 py-3`. Body rows separated by 1px `--border`, row hover `bg-secondary`. Money and counts right-aligned with `tabular-nums`. Wrap in `overflow-x-auto` card. Empty state: centred muted text.

### Forms
- Input: `w-full min-h-12 rounded-lg border border-input bg-background px-3.5 py-2.5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-destructive`, placeholder `text-muted-foreground/60`.
- Label above field: `text-[0.95rem] font-semibold`; required asterisk in `text-destructive`. **Bilingual labels**: English left, Urdu right on the same row (`flex justify-between items-baseline`), Urdu in `.urdu text-sm text-muted-foreground`.
- Error: `mt-1.5 text-sm font-medium text-destructive` with `role="alert"`. Hint: `mt-1.5 text-sm text-muted-foreground`.
- Use `dir="auto"` on text inputs so Urdu input flows RTL.

### Badges and status chips
`rounded-full px-3 py-1 text-xs font-semibold`. Green: `bg-primary/10 text-primary`. Gold: `bg-gold/15 text-gold-foreground border border-gold/40`. Danger: `bg-destructive/10 text-destructive`. Live indicator: small red pulsing dot (`size-2.5 rounded-full bg-red-500 animate-pulse`).

### Dropdowns / menus
`bg-card border border-border rounded-xl shadow-elegant p-3`. Items: `px-3 py-2.5 rounded-lg hover:bg-secondary`, optional 36px icon tile `bg-primary/10 text-primary rounded-lg` that turns solid primary on hover; title `text-sm font-semibold`, description `text-xs text-muted-foreground`.

### Signature device: the eight-point star
An eight-point star taken from the trust's logo. Use sparingly: one star-row divider (small · large · small, flanked by 1px lines at 30% opacity, in gold) and an optional faint oversized watermark on a dark section. SVG polygon points (viewBox `-11 -11 22 22`):
`0,-11 1.68,-4.07 7.78,-7.78 4.07,-1.68 11,0 4.07,1.68 7.78,7.78 1.68,4.07 0,11 -1.68,4.07 -7.78,7.78 -4.07,1.68 -11,0 -4.07,-1.68 -7.78,-7.78 -1.68,-4.07`
Also available as `.decorative-divider` (gold text, 3rem gradient hairlines either side).

### Footer / dark bands
`bg-primary-deep text-primary-foreground`; closing statement in Amiri bold (`clamp(1.75rem, 4.2vw, 2.75rem)`, line-height 1.14); small links `text-primary-foreground/75 hover:text-gold`; hairlines `border-primary-foreground/15`; legal text `text-xs text-primary-foreground/55`; social icons in 44px circles `bg-primary-foreground/10 hover:bg-gold hover:text-gold-foreground`.

## 7. Typography scale (as used)
`h1` page: Amiri bold `text-4xl md:text-6xl` (public hero) or `text-3xl` (ERP page title) · `h2` section: Amiri bold `text-2xl–3xl` in primary · `h3` card title: Amiri `text-xl` · Body `text-base` (`md:text-lg` for long prose), `leading-relaxed`, colour `foreground/85` · UI text `text-sm` · Captions `text-xs` · Eyebrow labels `text-xs uppercase tracking-widest text-gold` · Stat numbers Amiri `text-3xl md:text-4xl font-bold`.

## 8. Rules for building the donor management system
1. Use only the tokens above via CSS variables / Tailwind theme names (`bg-primary`, `text-gold`, `border-border`, `bg-primary-deep`, `bg-cream`). No hard-coded hex in components.
2. Sidebar is always `primary-deep`; active nav item is gold; page background is the warm off-white, never pure white (cards are white).
3. Gold is for money: the primary "Record collection / Receipt" button and key totals highlights. Everything else is green or outline.
4. Headings and big numbers are Amiri; every other piece of UI text is Inter.
5. Donor identity is the **mobile number**; show it in tables in Inter with `tabular-nums`.
6. Where a label benefits from it, show Urdu beside English (forms, nav captions, receipts). Receipts and printed documents: white background, primary green headings, gold hairline, logo top-left, Urdu trust name.
7. Keep shadows soft (`shadow-card`) and borders thin. Rounded corners everywhere (0.5rem+).
8. Support dark mode via `.dark` using the dark tokens; accessibility: visible focus rings, `aria-invalid` on errors, 44px minimum touch targets on mobile.
9. Icons: lucide-react, 16–20px, stroke style, coloured `text-primary` or `text-gold`.
10. Responsive first: tables scroll horizontally inside their card; stats strip is 2 columns on mobile and 4 on large screens; sidebar collapses on mobile.

## 9. Ready-to-paste CSS (Tailwind v4)
See `alsadiq-theme.css`, delivered alongside this file. It contains the `@theme inline` mapping, `:root` and `.dark` tokens, and the `btn-gold`, `btn-outline` and `decorative-divider` utilities.
