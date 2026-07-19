---
title: Components
categories:
  - development
tags:
  - components
  - react
  - customization
components: 8
related:
  - title: Styling
    url: /features/styling
  - title: Metadata Display
    url: /features/metadata
  - title: Configuration
    url: /configuration
---

# Components

All UI components live in `components/`. They are wired into the site via `theme.config.jsx`
and styled in `styles/global.css`. No imports are needed inside markdown — components that
appear on every page are registered globally in `theme.config.jsx`.


## Current components

| Component | File | Where rendered |
|-----------|------|----------------|
| `PageHeader` | `PageHeader.jsx` | Below page title — date and reading time |
| `TagList` | `TagList.jsx` | Below `PageHeader` — category and tag chips |
| `SiteFooter` | `SiteFooter.jsx` | Site-wide footer |
| `GitHubLink` | `GitHubLink.jsx` | Navbar — circular GitHub icon |
| `ThemeToggle` | `ThemeToggle.jsx` | Navbar — light/dark/system toggle |
| `DirFeed` | `DirFeed.jsx` | Flattened directories — inline scrolling feed |


## Component reference

### PageHeader

Renders publication date and estimated reading time on a single line below the page title.
Returns `null` when neither `date` nor `reading_time` is present in frontmatter.

Props: `date` (YYYY-MM-DD string), `reading_time` (integer minutes).

### TagList

Renders `categories` as blue chips and `tags` as gray chips below `PageHeader`.
Returns `null` when both arrays are empty.

Props: `categories` (string[]), `tags` (string[]).

### SiteFooter

Renders the site-wide footer: copyright year, build timestamp, and credits.
**Edit `components/SiteFooter.jsx` directly** to customize footer content across all pages.

### GitHubLink

Circular GitHub mark icon in the navbar. Returns `null` when `repo_url` is empty in
`mdsite.yaml`. No props — reads config directly.

### ThemeToggle

Cycles through system → light → dark using `useTheme()` from `next-themes`.
Shown in the navbar when `theme_toggle: navbar` in `mdsite.yaml`; otherwise
Nextra's built-in sidebar toggle is used. Uses a mounted-state guard to prevent
hydration mismatch.

### DirFeed

Renders a flattened directory (from `flatten` in `mdsite.yaml`) as an inline scrolling
feed. Fetches `public/dir-feeds/<name>.json` at runtime and renders each entry's title,
date, reading time, chips, and content.


## Adding a new component

**1. Create the component file**

```jsx
// components/MyWidget.jsx
/** One-line description of what this component does. */
export default function MyWidget({ label }) {
  return <div className="my-widget">{label}</div>
}
```

**2. Add CSS**

Add styles to `styles/global.css`. Use `--site-*` variables for theme-adaptive
colors. See [Styling](/features/styling) for details.

```css
.my-widget {
  padding: 0.5rem 1rem;
  color: var(--site-gray-600);
}
```

**3. Wire into theme.config.jsx**

For components that appear on every page, import them in `theme.config.jsx` and add
them to the `main` layout or `navbar.extraContent`:

```jsx
import MyWidget from './components/MyWidget'

// In the main layout:
main: ({ children }) => (
  <>
    {children}
    <MyWidget label="hello" />
  </>
),
```

For components used only on specific pages, import them directly inside the `.mdx` file:

```mdx
import MyWidget from '../../components/MyWidget'

# My Page

<MyWidget label="hello" />
```

**4. Access frontmatter (optional)**

Use `useConfig()` from `nextra-theme-docs` inside the component to read the current
page's frontmatter:

```jsx
import { useConfig } from 'nextra-theme-docs'

export default function MyWidget() {
  const { frontMatter } = useConfig()
  return <div>{frontMatter.title}</div>
}
```


## Planned components

| Component | Purpose |
|-----------|---------|
| `SemanticSearch` | Full-text and semantic search across all pages |
| `ThemeGenerator` | Derives color palette and logo hints from content signals |
| `RelatedPages` | Semantic similarity-based "you might also like" links |

These are Phase 2 features. Site-wide colors and fonts are already configurable today
via the `theme` block in `mdsite.yaml` — see [Configuration](/configuration).
