# Design System

The CiteSphere visual identity is a **Scholarly Press** aesthetic — warm, authoritative, and premium. Think university library meets modern SaaS.

---

## Color Palette

### Light Theme (`:root`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-main` | `#f9f8f3` | Page background — warm parchment/cream linen |
| `--bg-card` | `rgba(255, 255, 255, 0.94)` | Card/panel background — crisp ivory paper |
| `--bg-card-hover` | `#ffffff` | Card hover state |
| `--border-color` | `#e2ddd3` | Warm parchment borders |
| `--text-main` | `#1c1917` | Primary text — scholar charcoal ink |
| `--text-muted` | `#57534e` | Secondary text — warm graphite |
| `--text-inverse` | `#ffffff` | Text on dark backgrounds |
| `--primary` | `#1e3a8a` | **Oxford Navy Blue** — primary actions, links |
| `--primary-hover` | `#1e293b` | Primary hover/pressed state |
| `--primary-light` | `#f0f4ff` | Primary tint for focus rings, light backgrounds |
| `--accent-purple` | `#881337` | **Royal Burgundy/Crimson** — destructive actions, co-owner badge |
| `--accent-emerald` | `#0f766e` | **Cambridge Ivy Teal** — owner badge, success states |
| `--accent-amber` | `#b45309` | **Scholar Gold** — unowned badge, warnings |
| `--accent-rose` | `#9f1239` | Danger/delete actions |

### Dark Theme (`[data-theme="dark"]`)

| Token | Value |
|-------|-------|
| `--bg-main` | `#0c0f17` (deep observatory night) |
| `--bg-card` | `rgba(18, 24, 38, 0.88)` |
| `--primary` | `#3b82f6` (brighter blue for contrast) |
| `--accent-purple` | `#f43f5e` |
| `--accent-emerald` | `#14b8a6` |
| `--accent-amber` | `#f59e0b` |

---

## Typography

| Font | Variable | Usage |
|------|----------|-------|
| **Lora** (serif) | `--font-serif` | Paper titles, headings (`h1`-`h3`), `.academic-title` |
| **Inter** (sans) | `--font-sans` | Body text, buttons, labels, navigation |
| **JetBrains Mono** (mono) | `--font-mono` | DOIs, BibTeX code, RIS exports, CSL-JSON |

Fonts are loaded from Google Fonts via `<link>` in `index.html`. Fallback chains:
- Serif: `'Lora', 'Georgia', 'Times New Roman', serif`
- Sans: `'Inter', system-ui, -apple-system, sans-serif`
- Mono: `'JetBrains Mono', monospace`

---

## Spacing & Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small buttons, badges, inline tags |
| `--radius-md` | `8px` | Cards, inputs, standard buttons |
| `--radius-lg` | `12px` | Panels, modals, large containers |
| `--radius-full` | `9999px` | Pill shapes, avatar circles |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(28,25,23,0.05)` | Cards at rest |
| `--shadow-md` | `0 4px 14px rgba(28,25,23,0.07)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 12px 28px rgba(28,25,23,0.12)` | Modals, floating panels |
| `--shadow-glow` | `0 0 20px rgba(30,58,138,0.18)` | Primary action emphasis |

---

## Component Classes

### Buttons (`.btn`)

| Class | Appearance |
|-------|-----------|
| `.btn` | Base — flex, padding, rounded, font-weight 600, transition |
| `.btn-primary` | Oxford Navy gradient, white text, glow shadow |
| `.btn-secondary` | Ivory background, border, dark text |
| `.btn-outline` | Transparent, primary border, primary text |
| `.btn-danger` | Light rose background, crimson text → solid crimson on hover |
| `.btn-sm` | Smaller padding/font for inline actions |

All buttons have `:active { transform: scale(0.98) }` for tactile feedback.

### Badges (`.badge`)

| Class | Color | Usage |
|-------|-------|-------|
| `.badge-owner` | Teal border + teal text | "Owned" status |
| `.badge-coowner` | Burgundy border + burgundy text | "Co-owned" status |
| `.badge-unowned` | Amber border + amber text | "Unowned / Orphan" status |

### Panels (`.glass-panel`)
Glassmorphism card: semi-transparent background, `backdrop-filter: blur(12px)`, subtle border and shadow.

### Modals
- `.modal-overlay` — fixed full-screen backdrop with blur, `fadeIn` animation.
- `.modal-container` — centered, max-width 680px, scrollable, `slideUp` animation.

### Forms
- `.form-group` — flex column with gap, margin-bottom.
- `.form-label` — uppercase, letter-spaced, bold.
- `.form-input`, `.form-select`, `.form-textarea` — consistent border, radius, focus ring.

---

## Theme Switching

Theme is toggled by setting `data-theme="dark"` on the `<html>` element:

```typescript
document.documentElement.setAttribute("data-theme", theme);
localStorage.setItem("citation_theme", theme);
```

The system auto-detects OS preference on first load via `window.matchMedia("(prefers-color-scheme: dark)")`.

---

## Icons

Using **Font Awesome 6 Free** (CDN). Key icons used:

| Icon | Context |
|------|---------|
| `fa-user-bookmark` | My Citations scope |
| `fa-globe` | Global Directory scope |
| `fa-box-archive` | Unowned/Orphan scope |
| `fa-sun` / `fa-moon` | Theme toggle |
| `fa-copy` | Copy to clipboard actions |
| `fa-pen-to-square` | Edit citation |
| `fa-trash-can` | Delete/remove |
| `fa-house` | Home / Citations Stream |
| `fa-magnifying-glass` | Search |
