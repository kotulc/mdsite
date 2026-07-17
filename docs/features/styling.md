---
title: Styling
categories:
  - features
tags:
  - css
  - theming
  - nextra
components: 2
related:
  - title: Features Overview
    url: /features
  - title: Metadata Display
    url: /features/metadata
  - title: Configuration
    url: /configuration
---

# Styling

Custom styles are written in plain CSS. No Tailwind configuration is needed —
Nextra uses Tailwind internally with its own prefix, so adding Tailwind to the
project would create conflicts.

## Where styles live

| File | Purpose |
|------|---------|
| `styles/global.css` | All custom CSS for this project |
| `_app.jsx` | Root-level Next.js app wrapper; imports `global.css` |
| `pages/_app.jsx` | Auto-copied from `_app.jsx` by `ingest.js` on each run |

`_app.jsx` at the project root is the canonical source. The ingest pipeline
copies it into `pages/` automatically, so edits to `_app.jsx` are preserved
across ingest runs. Do not edit `pages/_app.jsx` directly.

## Site CSS variables

`styles/global.css` defines a set of `--site-*` design tokens at the top of the
file. They adapt to light/dark mode automatically, and the primary shades derive
from the `theme.color` palette configured in `mdsite.yaml`:

```css
/* Gray scale */
--site-gray-100   /* very light background tint */
--site-gray-200   /* borders and dividers */
--site-gray-400   /* disabled / placeholder */
--site-gray-500   /* secondary text */
--site-gray-600   /* body text */
--site-gray-900   /* headings */

/* Primary accent — follows theme.color */
--site-primary-100  /* light accent background */
--site-primary-600  /* link color */
--site-primary-700  /* link hover */
```

Use these variables in `global.css` instead of hardcoding colors so that light
mode, dark mode, and the configured palette all work automatically:

```css
/* Good — adapts to theme */
.my-element { color: var(--site-gray-600); }

/* Avoid — breaks dark mode and ignores theme.color */
.my-element { color: #4b5563; }
```

## Nextra's internal Tailwind

Nextra bundles Tailwind and applies it with an `nx-` prefix on its own elements
(e.g. `nx-text-gray-500`, `nx-flex`). These are Nextra-internal and should not
be added to your own components. To override Nextra element styles, target the
semantic class names Nextra exposes instead:

```css
/* Nextra's search input */
.nextra-search input { border-radius: 0.5rem; }

/* Nextra's sidebar */
.nextra-sidebar { font-size: 0.875rem; }

/* Nextra's content wrapper */
.nextra-content { max-width: 52rem; }
```

Inspect the rendered HTML with browser DevTools to find the correct selector.
Prefer scoped overrides over broad element resets to avoid breaking Nextra's
built-in styles.

## Adding custom styles

1. Open `styles/global.css` and add your CSS at the end.
2. Use `--site-*` variables for any color that should adapt to dark mode.
3. Restart the dev server (`npm run dev`) if a newly added class does not apply —
   Next.js hot-reloads JS but occasionally misses CSS-only changes.

## Page layout structure

The `main` key in `theme.config.jsx` wraps only the page content area. Nextra
renders the left nav and right TOC column outside of `main`, so no custom flex
layout is needed.

`MetaSidebar` is rendered via `toc.extraContent`, which places it below the
section headings in Nextra's right TOC column:

```
Nextra layout
├── Left nav (Nextra)
├── main  →  PageMeta + page content + PageContinuation
└── Right TOC column (Nextra)
    ├── "On This Page" heading list
    └── .meta-sidebar-content  (tags, metrics, related)
```

`MetaSidebar` returns `null` when no frontmatter metadata is present, so the
divider and sections only appear on pages that have tags, metrics, or related links.

## Chip pills

Categories and tags render as pill chips. Two style variants are provided:

| Class | Color | Used for |
|-------|-------|---------|
| `.chip.chip-category` | Primary (follows `theme.color`) | `categories:` frontmatter list |
| `.chip.chip-tag` | Gray | `tags:` frontmatter list |

To change chip appearance, edit the `.chip`, `.chip-category`, and `.chip-tag`
rules in `styles/global.css`.
