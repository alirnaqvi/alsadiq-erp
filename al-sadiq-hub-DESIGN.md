# Al Sadiq Hub — design spec

Captured from the live site [https://al-sadiq-hub-ef6fdbb1.vercel.app/](https://al-sadiq-hub-ef6fdbb1.vercel.app/) on 25 Oct 2026. That deployment does not publish a `design.md` (tried `/design.md`, `/DESIGN.md`, `/docs/design.md`). This file is reconstructed from the site’s CSS tokens, fonts, layout, and routes.

Public site: Vite + React SPA. Fonts from Google Fonts. Bilingual English / Urdu.

---

## Brand

A Shia Islamic centre in G-9/2, Islamabad. Visual language: deep mosque green, brass gold, cream paper, serif display (Amiri) for titles, Inter for UI, Noto Nastaliq Urdu for Urdu lines.

Feel: calm, formal, community institution — not a startup dashboard. Gold is for primary actions (Donate, Apply). Green is for surfaces, headers, and section titles.

---

## Colour tokens

From `:root` on the live CSS:

| Token | Value | Use |
| --- | --- | --- |
| `--primary` | `oklch(38% .09 155)` | Section titles, links, green chrome |
| `--primary-deep` | `oklch(28% .08 155)` | Hero overlay, darker green |
| `--primary-foreground` | `oklch(99% .005 95)` | Text on green |
| `--gold` | `oklch(74% .135 80)` | Accents, prayer-time chips |
| `--gold-foreground` | `oklch(18% .02 160)` | Text on gold buttons |
| `--accent` | `oklch(78% .13 85)` | Light gold hover |
| `--accent-foreground` | `oklch(20% .05 80)` | Text on light gold |
| `--cream` | `oklch(97% .015 90)` | Warm paper panels |
| `--background` | `oklch(99% .005 95)` | Page |
| `--foreground` | `oklch(18% .02 160)` | Body text |
| `--muted` | `oklch(96% .01 95)` | Subtle fills |
| `--muted-foreground` | `oklch(45% .02 160)` | Secondary text |
| `--border` | `oklch(90% .02 95)` | Hairlines |
| `--input` | `oklch(92% .015 95)` | Form fields |
| `--card` | `oklch(100% 0 0)` | Cards |
| `--destructive` | `oklch(55% .22 27)` | Errors |
| `--ring` | `oklch(38% .09 155)` | Focus ring |

Gradients:

- `--gradient-hero`: `linear-gradient(135deg, oklch(28% .08 155 / .85), oklch(38% .09 155 / .7))` over the building photo
- `--gradient-gold`: `linear-gradient(135deg, oklch(78% .135 80), oklch(65% .13 70))`
- `--gradient-green`: `linear-gradient(135deg, oklch(38% .09 155), oklch(28% .08 155))`

Shadows:

- `--shadow-gold`: `0 8px 30px -8px oklch(74% .135 80 / .4)`
- `--shadow-elegant`: `0 10px 40px -10px oklch(28% .08 155 / .25)`
- `--shadow-card`: `0 2px 10px -2px oklch(18% .02 160 / .08)`

`--radius`: `.5rem`

Approximate hex (for tools that do not take oklch): primary `#1f6b4a`, deep `#154832`, gold `#c9a227`, cream `#f7f3ea`, ink `#1a221f`.

---

## Typography

Google Fonts:

```
family=Amiri:wght@400;700
family=Inter:wght@400;500;600;700
family=Noto+Nastaliq+Urdu:wght@400;600
```

| Token | Stack | Role |
| --- | --- | --- |
| `--font-sans` | `"Inter", system-ui, sans-serif` | Body, nav, buttons |
| `--font-display` | `"Amiri", Georgia, serif` | H1 / H2, logo wordmark |
| `--font-urdu` | `"Noto Nastaliq Urdu", serif` | Urdu headings and labels |

Hero H1: Amiri Bold, ~72px desktop (`text-5xl md:text-7xl`), cream on green.

Section H2: Amiri Bold, ~36px (`text-3xl md:text-4xl`), `--primary` green.

Body: Inter 16px / regular, `--foreground`.

Eyebrows: small caps / wide tracking, gold.

Urdu sits under or beside English titles (e.g. ہفتہ وار پروگرام under “Weekly Programs”).

---

## Layout

- Full-bleed hero with building photo + green overlay.
- Fixed header (`fixed top-0 inset-x-0 z-40`): logo left, nav centre, gold **Apply for Aid** + **Donate** right.
- Thin utility bar above the header: phone, next prayer time, language (اردو), social icons.
- Content in a centred max-width container on cream/white.
- Footer: address, phone, email, social, WhatsApp chat.
- Floating WhatsApp button, bottom-right, green.

---

## Components

- **Donate / primary CTA**: class `btn-gold` — gold fill, dark text, Inter semibold, rounded, arrow on some instances.
- **Secondary CTA**: outlined cream/white on the hero (“Learn more”).
- **Nav**: Inter, dropdowns for About / Services / Events / Media.
- **Service tiles**: numbered `01`–`07`, bilingual English + Urdu.
- **Prayer times**: pill chips; next prayer filled gold, others outline.
- **Cards**: white, `--shadow-card`, radius 8px.
- Logo: circular crest + “Al Sadiq Trust” + Urdu الصادق ٹرسٹ in gold.

---

## Routes on this deployment

`/`, `/about`, `/financials`, `/services/prayers`, `/services/library`, `/services/school`, `/services/maghsal`, `/services/education`, `/services/marriage`, `/services/medical`, `/calendar`, `/programs`, `/media`, `/gallery`, `/contact`, `/apply`

Assets: `/logo.png`, `/assets/hero-DozTPqQ_.png`

---

## Voice

English first, Urdu as honourific pairing — not a mirrored UI. Copy is institutional and specific (years, hall size, staff count). Donate and apply flows go through WhatsApp (`wa.me`) as well as on-site pages.
