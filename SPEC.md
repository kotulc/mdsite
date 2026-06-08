# mdsite — Technical Specification


## Development Philosophy

Every user interaction, manual step, and configuration decision must be documented
explicitly as it is implemented. The purpose is twofold:

1. **Reproducibility** — any developer can follow documented steps to reproduce the
   current project state from a fresh clone.
2. **Automation target** — every documented manual step is a candidate for scripted
   automation in a later phase. Steps are captured now so they can be eliminated later.

When implementing any phase:
- Record every command that must be run manually
- Document every file that must be edited by hand, and what must change
- Flag any step that requires a decision or user input
- Write scripts incrementally: if a step is repeated more than once, automate it

The end goal (Phase 6) is a single command that accepts a content source and a minimal
config and produces a fully built, previewable site with no further manual intervention.
Agent-callable interfaces should be non-interactive and driven entirely by `site.config.js`.


## Stack
- **Framework**: Next.js (static export)
- **Content layer**: Nextra (MDX rendering, page tree, routing)
- **Deployment**: GitHub Pages via GitHub Actions
- **Styling**: Nextra docs theme (Phase 1); custom theme (Phase 2)


## Project Structure
```
mdsite/
├── content/          # MDX source files (copied in by mdpub)
├── pages/            # Next.js pages (minimal — mostly delegated to Nextra)
├── components/       # Custom components (pageIndex, search, theme)
├── public/           # Static assets (generated logos, favicons)
├── theme.config.js   # Nextra theme config
└── site.config.js    # Site-level config (name, base path, metadata)
```


## Content Pipeline
This template is pipeline-agnostic — it accepts raw markdown from any source directory in
any folder structure. The ingestion script (`npm run setup` / `npm run ingest`) mirrors the
source tree into the Next.js site content directory (`pages/`), converting `.md` → `.mdx`.

**Source layout**: No specific folder structure is required. Any directory tree of markdown
files is valid. The only special convention is `home.md` or `index.md` at any level, which
is renamed to `index.mdx` to serve as the section landing page.

**Image handling**: Any `images/` subdirectory found in the source is copied to
`public/images/<relative-path>/` and image references in the adjacent markdown files are
rewritten to absolute `/images/...` URLs.

**`_meta.json` generation**: At each folder level, an ordering file is auto-generated:
- If any page in the folder has a `date` frontmatter field, pages are sorted newest-first
- Otherwise, pages are sorted alphabetically by slug

**Frontmatter fields used by the template**: `title`, `date`, `categories`, `tags`.
Additional fields are passed through and available in components via Nextra's `frontMatter`.

For local development the default source is `docs/`.


## Site Content Directory (`pages/`)
The generated site content lives in `pages/` — a name imposed by the Next.js Pages Router.
This directory is not "pages" in the page-type sense; it is the framework's file-system
routing root and contains all generated MDX content, static pages, and posts.

**Why `pages/`**: Next.js Pages Router requires this exact directory name. It cannot be
renamed without migrating to the App Router (supported in Nextra v3, not v2). A future
migration to Nextra v3 would allow using `app/` instead, which is slightly more neutral but
still a framework convention. This is tracked as an open question.

In all user-facing documentation, refer to this as the **site content directory**; use the
path `pages/` only when describing the technical file structure.


## Routing & Configuration
- Nextra handles file-system routing from `pages/` (the site content directory)
- `_meta.json` at each folder level controls display order and section labels
- Per-page theme overrides (e.g. hide sidebar, full-width) set via frontmatter


## Page Metadata Display
Each page renders frontmatter fields as UI elements:
- Tags displayed as chips/pills below the page title
- Reading time and other metrics shown in a page header or sidebar component
- Metadata fields are opt-in per page via frontmatter keys (spec TBD)


## Site Footer
The footer appears on every page and contains three elements:

1. **Copyright** — `© <year> <site title>` from `site.config.js`
2. **Last updated** — build timestamp injected at compile time via `NEXT_PUBLIC_BUILD_TIME`
   (formatted as `Month D, YYYY at H:MM AM/PM UTC`); absent if the env var is not set
3. **Credits** — "Powered by [mdsite](...) and [Nextra](...)" with links

**Implementation**: `NEXT_PUBLIC_BUILD_TIME` is set in `next.config.js` as
`new Date().toISOString()` evaluated at build time. The `SiteFooter` component in
`theme.config.jsx` reads this env var and formats it client-side via `Intl`.


## Semantic Theming
Two fields in `site.config.js` drive all color decisions across the site:

- `content_style` — describes the nature of the content (e.g. technical, narrative, minimal)
- `theme_mood` — describes the intended emotional tone (e.g. calm, bold, professional)

The combination of these two fields maps to a pre-defined 2–3 tone color palette drawn from a
well-known color library (TBD — candidates: Open Color, Tailwind, Material Design). The mapping
is an associative table: `(style, mood) → [primary, secondary, accent?]`.

Output: CSS custom properties injected at build time, applied site-wide. All components
(including the logo) reference these variables, so the palette is the single source of truth.

Phase 1: Palette manually set in `site.config.js`. Phase 2: Palette derived automatically from
`content_style` + `theme_mood` via the associative map.


## Semantic Search
Search is context-aware and page-scoped. Rather than a single global index, `mdpub` generates
a per-page JSON index file at build time:

- **Location**: `public/search/<page-slug>.json` (or equivalent static path)
- **Contents**: relational similarity data — the current page's relationship to every other page
  on the site, plus optional external references ranked by relevance
- **Query model**: client-side only — when the user searches on a given page, only that page's
  index file is fetched and queried; no server required
- **Result shape** (draft): `[{title, slug, excerpt, score, external?}]`

Phase 1: Nextra built-in keyword search. Phase 2: Replace search bar component with the
page-scoped semantic search, consuming the pre-computed index.


## Logo Generation
Logo generation is a build-time utility within `mdsite`. It produces a static SVG written
to `public/` (used as both the site logo and favicon).

**Inputs** (from `site.config.js`):
- `content_style` and `theme_mood` — determine icon selection and background shape
- `title` — used as an optional text layer or to seed icon selection
- `logo_seed` — integer seed stored in `site.config.js`; changing it reshuffles the output

**Composition** (layered SVG):
1. Background shape: one of square, circle, or triangle
2. Foreground icon or text: Text or one Bootstrap icon, selected and positioned over the background
3. Optional second shape or icon layer for variation

All colors are drawn from the site's active theme palette (CSS custom properties → resolved
at build time).

**Reseed workflow**: update `logo_seed` in `site.config.js`, run `mdpub build` — a new
SVG is generated without changing any other config.

Phase 2: user selects specific layers and icons from a pre-defined set rather than relying
on the seed.


## Deployment
GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. `npm ci`
2. `npm run ingest` (source from `vars.CONTENT_SOURCE`, default `docs/`)
3. `npm run build` — Next.js static export → `out/`
4. Push `out/` to `gh-pages` branch via `peaceiris/actions-gh-pages`

`basePath` and `assetPrefix` are read from `site.config.js` (`base_path` field) at build time,
with `BASE_PATH` env var as an optional override. `trailingSlash: true` ensures reliable
relative-link resolution on static hosts.


## mdpub Integration Points
| mdpub command     | Effect on mdsite                                      |
|-------------------|-----------------------------------------------------------|
| `mdpub init`      | Installs deps, writes `site.config.js`, copies template   |
| `mdpub build`     | Populates `content/`, runs `next build`                   |
| `mdpub preview`   | Runs `next dev` locally                                   |
| `mdpub publish`   | Triggers GitHub Actions deploy or runs `gh-pages` push    |


## Open Questions
- `content_style` and `theme_mood`: valid vocabulary / label set (TBD — define before implementing the theming associative map)
- Color library selection: Open Color, Tailwind, or Material Design (TBD)
- Search result shape: finalize the per-page index JSON schema
- `site.config.js` full schema: document all expected fields and their types
- **Nextra v3 / App Router migration**: Nextra v3 uses the Next.js App Router (`app/` directory instead of `pages/`). Migrating would eliminate the confusing `pages/` name for the site content directory, but requires evaluating Nextra v3 stability and any breaking changes in MDX handling, `_meta.json` format, and the theme config API.
