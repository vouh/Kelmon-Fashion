# Kelmon — Design

Colours, typography and component specs for the Kelmon front end.

**Source of truth:** [`styles/design.css`](styles/design.css) (CSS custom
properties) and [`tailwind.config.ts`](tailwind.config.ts) (the Tailwind mapping).
This document describes those files — if a value here disagrees with them, they
win.

---

## Contents

- [Brand](#brand)
- [Colour palette](#colour-palette)
- [Semantic colour tokens](#semantic-colour-tokens)
- [Typography](#typography)
- [Type scale](#type-scale)
- [Spacing](#spacing)
- [Radius, shadow, layout](#radius-shadow-layout)
- [Components](#components)
- [Theming](#theming)
- [Admin panel palette](#admin-panel-palette)
- [Using tokens](#using-tokens)

---

## Brand

Kelmon is **purple and gold** — a plum-dark or bright-white ground, a purple
brand colour taken from the logo, and gold as the accent used for prices and
premium cues.

| Role | Light | Dark |
|---|---|---|
| Brand purple | `#8e44ad` | `#c084fc` |
| Gold accent | `#c5a059` | `#e9c349` |
| Ground | `#faf6fc` | `#1e0f2e` |

Two rules the system holds to deliberately:

- **Solid fills only — no gradients.** The `--kelmon-gradient-*` tokens exist for
  historical reasons but resolve to flat colours, and the glow tokens resolve to
  `transparent` / `none`.
- **Gold is for value, not for interaction.** Prices, taglines and premium
  framing use gold; buttons and links use purple. Gold buttons read as a second
  primary and muddy the hierarchy.

---

## Colour palette

### Dark theme (`:root`, `.dark`) — default

**Backgrounds — purple night, not black**

| Token | Value | Use |
|---|---|---|
| `--kelmon-bg-primary` | `#1e0f2e` | Page ground |
| `--kelmon-bg-elevated` | `#2a1740` | Cards, raised panels |
| `--kelmon-bg-surface` | `#32204a` | Inputs, wells |
| `--kelmon-bg-glass` | `rgba(42, 23, 64, 0.92)` | Frosted nav |
| `--kelmon-bg-overlay` | `rgba(30, 15, 46, 0.65)` | Modal scrim |

**Purple**

| Token | Value |
|---|---|
| `--kelmon-purple-deep` | `#8e44ad` |
| `--kelmon-purple-brand` | `#8e44ad` |
| `--kelmon-purple-light` | `#c084fc` |
| `--kelmon-purple-muted` | `rgba(192, 132, 252, 0.16)` |

**Gold**

| Token | Value |
|---|---|
| `--kelmon-gold-primary` | `#c5a059` |
| `--kelmon-gold-light` | `#e9c349` |
| `--kelmon-text-gold` | `#e9c349` |

**Text**

| Token | Value | Use |
|---|---|---|
| `--kelmon-text-primary` | `#f7f0fb` | Body and headings |
| `--kelmon-text-secondary` | `#c9b5d8` | Supporting copy |
| `--kelmon-text-disabled` | `#7d6a8c` | Disabled |
| `--kelmon-text-inverse` | `#1e0f2e` | On purple fills |

**Borders**

| Token | Value |
|---|---|
| `--kelmon-border-subtle` | `rgba(197, 160, 89, 0.35)` — gold hairline |
| `--kelmon-border-default` | `rgba(192, 132, 252, 0.22)` — purple hairline |
| `--kelmon-border-focus` | `#c084fc` |

### Light theme (`.light`)

| Token | Value |
|---|---|
| `--kelmon-bg-primary` | `#faf6fc` |
| `--kelmon-bg-elevated` | `#ffffff` |
| `--kelmon-bg-surface` | `#ffffff` |
| `--kelmon-purple-deep` | `#7030a0` |
| `--kelmon-purple-brand` | `#8e44ad` |
| `--kelmon-purple-light` | `#a855c8` |
| `--kelmon-gold-primary` | `#c5a059` |
| `--kelmon-text-primary` | `#2a1a36` |
| `--kelmon-text-secondary` | `#5c4a6a` |
| `--kelmon-text-disabled` | `#b0a4bc` |
| `--kelmon-text-inverse` | `#ffffff` |
| `--kelmon-border-focus` | `#8e44ad` |

Note gold does **not** lighten in light mode — `#c5a059` in both, because
`#e9c349` fails contrast on white.

### Semantic status

| Token | Value |
|---|---|
| `--kelmon-success` | `#22c55e` |
| `--kelmon-error` | `#ef4444` (light theme: `#dc2626`) |
| `--kelmon-warning` | `#f59e0b` |
| `--kelmon-info` | `#3b82f6` |

Each has a `-muted` variant at 15% alpha for backgrounds.

---

## Semantic colour tokens

The `--theme-*` tokens are what components actually use. Tailwind maps them to
class names, so `bg-surface` and `text-on-surface` flip with the theme without
conditional classes.

| Tailwind class | Token | Light | Dark |
|---|---|---|---|
| `bg-background` | `--theme-bg` | `#faf6fc` | `#1e0f2e` |
| `bg-surface` | `--theme-surface` | `#ffffff` | `#2a1740` |
| `bg-surface-dim` | `--theme-surface-dim` | `#f3ebf9` | `#180c26` |
| `bg-surface-container` | `--theme-surface-container` | `#efe4f7` | `#35204d` |
| `bg-surface-container-high` | `--theme-surface-container-high` | `#e6d6f0` | `#42285c` |
| `bg-surface-container-highest` | `--theme-surface-container-highest` | `#d9c4e8` | `#533470` |
| `bg-surface-container-lowest` | `--theme-surface-container-lowest` | `#ffffff` | `#160a22` |
| `text-on-surface` | `--theme-on-surface` | `#2a1a36` | `#f7f0fb` |
| `text-on-surface-variant` | `--theme-on-surface-variant` | `#5c4a6a` | `#c9b5d8` |
| `bg-primary` | `--theme-primary` | `#8e44ad` | `#c084fc` |
| `bg-primary-container` | `--theme-primary-container` | `#8e44ad` | `#8e44ad` |
| `text-on-primary` | `--theme-on-primary` | `#ffffff` | `#1e0f2e` |
| `text-secondary` | `--theme-secondary` | `#c5a059` | `#e9c349` |
| `border-outline` | `--theme-outline` | `#8e44ad` | `#c084fc` |
| `text-error` | `--theme-error` | `#dc2626` | `#ffb4ab` |
| `bg-footer` | `--theme-footer-bg` | `#8e44ad` | `#3b1a55` |

**`--theme-primary` inverts between modes** — `#8e44ad` on white, `#c084fc` on
plum — because the mid purple lacks contrast on a dark ground and the light purple
lacks it on white. `--theme-on-primary` inverts with it.

---

## Typography

Three families, loaded via `next/font/google` in `app/layout.tsx`.

| Family | Token | CSS variable | Role |
|---|---|---|---|
| **Playfair Display** | `--kelmon-font-display` | `--font-playfair` | Headings, display, prices |
| **Cormorant Garamond** (600) | `--kelmon-font-tagline` | `--font-cormorant` | Taglines, small caps labels |
| **Inter** | `--kelmon-font-body` | `--font-inter` | Body, UI, buttons |
| JetBrains Mono | `--kelmon-font-mono` | — | Order ids, code (fallback only) |

The pairing is deliberate: a high-contrast serif for editorial weight, a humanist
sans for everything functional, and a second serif reserved for small uppercase
labels so they read as typographic rather than as UI chrome.

---

## Type scale

From `tailwind.config.ts`. Each name sets family, size, line height and weight
together, so `font-display-lg text-display-lg` is the complete style.

| Class | Size | Line height | Weight | Family |
|---|---|---|---|---|
| `display-lg` | 48px | 1.1 (−0.02em) | 700 | Playfair |
| `display-md` | 36px | 1.2 | 700 | Playfair |
| `headline-lg` | 32px | 1.3 | 600 | Playfair |
| `headline-sm` | 24px | 1.4 | 600 | Playfair |
| `title-lg` | 20px | 28px | 600 | Inter |
| `body-lg` | 16px | 24px | 400 | Inter |
| `body-md` | 14px | 20px | 400 | Inter |
| `button-text` | 15px | 1 | 600 | Inter |
| `label-caps` | 12px | 16px (0.1em) | 600 | Cormorant |

`label-caps` is always uppercase with wide tracking — the small gold or purple
eyebrow above headings.

---

## Spacing

| Token | Value | Tailwind |
|---|---|---|
| `--kelmon-space-1` | 4px | |
| `--kelmon-space-2` | 8px | `xs` |
| `--kelmon-space-3` | 12px | |
| `--kelmon-space-4` | 16px | `sm` |
| `--kelmon-space-6` | 24px | `md` |
| `--kelmon-space-8` | 32px | |
| `--kelmon-space-12` | 48px | `lg` |
| — | 64px | `xl` |

Page gutters: `margin-mobile` 20px, `margin-desktop` 80px.

---

## Radius, shadow, layout

| Token | Value |
|---|---|
| `--kelmon-radius-sm` | 6px |
| `--kelmon-radius-md` | 10px |
| `--kelmon-radius-lg` | 16px |
| `--kelmon-radius-xl` | 24px |
| `--kelmon-radius-full` | 9999px |

| Token | Value |
|---|---|
| `--kelmon-shadow-sm` | `0 1px 3px rgba(30,15,46,.45)` dark / `rgba(142,68,173,.1)` light |
| `--kelmon-shadow-md` | `0 8px 28px rgba(30,15,46,.5)` dark / `rgba(142,68,173,.16)` light |
| `--kelmon-nav-shadow` | `0 8px 28px rgba(88,40,130,.35)` dark / `0 8px 32px rgba(142,68,173,.16)` light |

Glow shadows resolve to `none` — depth comes from soft purple-tinted shadows, not
from light bloom.

| Token | Value |
|---|---|
| `--kelmon-button-height` | 48px |
| `--kelmon-sidebar-width` | 260px |
| `--kelmon-content-max-width` | 1280px (Tailwind `max-w-content`) |

---

## Components

Utility classes in `styles/design.css`:

### Buttons

```css
.kelmon-btn-primary   /* 48px, purple #8e44ad, white text, radius-md, 600 */
.kelmon-btn-primary:hover { background: #7a3a96; }

.kelmon-btn-secondary /* 48px, transparent, 1px gold border, gold text */
```

Primary is a solid purple fill; secondary is a gold outline. There is no gold
fill button by design.

### Card

```css
.kelmon-card  /* bg-elevated, 1px subtle gold border, radius-lg,
                 16px padding, shadow-sm */
```

### Input

```css
.kelmon-input        /* full width, 48px, bg-surface, 1px default border */
.kelmon-input:focus  /* border-color -> border-focus, no outline */
```

### Text treatments

```css
.kelmon-price    /* gold, Playfair, 600 — prices are display type, not body */
.kelmon-tagline  /* gold, Cormorant, 11px, 0.12em tracking, uppercase */
.kelmon-heading  /* Playfair, 700, text-primary */
```

### Navigation

```css
.kelmon-glass-nav  /* bg-glass + backdrop-filter blur(12px)
                      + 1px subtle top border */
```

---

## Theming

Three pieces:

1. **`.dark` / `.light`** classes on `<html>` redefine the custom properties.
   Dark shares the `:root` block, so it is the default if no class is applied.
2. **An inline script in `app/layout.tsx`** reads `localStorage['kelmon-theme']`
   and applies the class **before first paint**, which is what prevents a flash of
   the wrong theme.
3. **`ThemeProvider`** owns the runtime toggle and persists the choice;
   `ThemeToggle` is the control.

Tailwind is configured `darkMode: "class"`, but because the semantic tokens already
flip, most components need no `dark:` variants at all. Reach for `dark:` only when
a design genuinely differs between modes rather than merely re-colouring.

Default is `light` — the layout script falls back to `'light'` when nothing is
stored.

---

## Admin panel palette

The admin panel at `/admin` is **deliberately outside this system**. It uses fixed
Tailwind colours rather than the theme tokens, so it stays dark regardless of the
storefront setting.

| Role | Value |
|---|---|
| Ground | `zinc-950` |
| Cards | `zinc-900` |
| Borders | `white/5` |
| Accent | `purple-600` fills, `purple-300` text |
| Muted text | `white/30`–`white/50` |

Type is much smaller and heavier than the storefront — 9–12px, `font-black`,
uppercase, wide tracking — because it is a dense data tool, not an editorial
surface.

### Chart colours

Validated for the dark admin surface (`zinc-900`, `#18181b`):

| Role | Value | Notes |
|---|---|---|
| Series | `#a855f7` | Single series per chart; OKLCH L 0.58, clears 3:1 |
| Good / paid | `#0ca30c` | |
| Warning / unpaid | `#fab219` | |
| Critical / failed | `#d03b3b` | |

The status trio is CVD-separated (worst adjacent pair ΔE 11.3 protan) and each
always ships with **an icon and a text label**, so state is never carried by colour
alone. Charts use one series each — orders and revenue are different scales, so
they get two charts rather than one dual-axis chart.

---

## Using tokens

**Prefer Tailwind semantic classes.** They resolve through the custom properties
and flip with the theme:

```tsx
<div className="bg-surface-container text-on-surface border border-outline/40">
  <p className="font-label-caps text-label-caps uppercase text-primary">Salon</p>
  <h2 className="font-display-md text-headline-lg text-on-surface">Clock the glam</h2>
  <p className="font-body-md text-body-md text-on-surface-variant">…</p>
  <span className="font-display-md text-secondary">KES 1,500</span>
</div>
```

**Use the raw custom properties** only outside Tailwind's reach — keyframes,
inline SVG fills, a third-party widget:

```css
stroke: var(--theme-primary);
```

**Do not hardcode hex values in components.** The two sanctioned exceptions are
the admin panel (fixed dark palette above) and the validated chart colours, both
of which are intentionally theme-independent.

### Money

Always through `formatKes()` in `lib/products.ts`, which renders
`KES 1,500` with `en-KE` grouping. Prices get display type and gold —
`font-display-md text-secondary` — never body type.
