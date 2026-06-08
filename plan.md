# mdsite — Implementation Plan

Goal: go from a blank repo to a fully functional static site that renders the `examples/frww`
content with preview and publish capabilities. Intelligence features (search, theming, logo)
are deferred to later phases.

Reference content: 24 markdown files — 7 static pages and 16 dated blog posts organized under
`pages/` and `posts/<year>/`, with `title`, `date`, `categories`, and `tags` frontmatter.


---

## Phase 1 — Project Bootstrap

**Goal:** A running Next.js + Nextra dev server with an empty site.

### Tasks
1. Initialize `package.json` with core dependencies:
   - `next`, `react`, `react-dom`
   - `nextra`, `nextra-theme-docs`
2. Add `next.config.js` with Nextra plugin wired in
3. Add `theme.config.js` — minimal Nextra docs theme config (site title, logo placeholder)
4. Add `site.config.js` — schema stub with required fields:
   ```js
   // site name, base_url, base_path, content_style, theme_mood, logo_seed
   ```
5. Create directory structure per SPEC:
   - `content/`, `components/`, `pages/`, `public/`
6. Add a placeholder `content/index.mdx`
7. Verify `next dev` runs and serves the empty site

### Done when
`next dev` starts without errors and the browser shows the Nextra shell.


---

## Phase 2 — Content Integration

**Goal:** All example content renders correctly with proper routing and images.

### Tasks
1. Copy `examples/frww/pages/` → `content/pages/`
   and `examples/frww/posts/` → `content/posts/`
2. Rename `.md` → `.mdx` where needed (Nextra expects MDX)
3. Copy image assets to `public/images/` and rewrite relative image paths in content
4. Add `_meta.js` at each folder level to define display order and section labels:
   - `content/pages/_meta.js` — static page ordering
   - `content/posts/_meta.js` — year-folder ordering (newest first)
   - `content/posts/<year>/_meta.js` — per-year post ordering by date
5. Add a root `content/index.mdx` that serves as the home page (or redirect to `pages/home`)
6. Verify all 24 pages render without build errors

### Done when
`next dev` renders all pages and posts with correct content and working images.


---

## Phase 2b — Generalized Source Layout

**Goal:** `npm run ingest` accepts any folder structure of markdown files, not just the
two-level `pages/` + `posts/<year>/` layout of `examples/frww`.

### Background
The current ingest script hardcodes two source paths (`<src>/pages/` and
`<src>/posts/<year>/`). Any content source with a different structure will fail. The fix is
to walk the source tree generically and mirror it into the site content directory (`pages/`).

### Tasks
1. Rewrite `ingest_static_pages()` and `ingest_posts()` in `scripts/ingest.js` as a single
   recursive `ingest_dir(src_dir, dest_dir)` function that:
   - Walks any directory tree
   - Converts `.md` → `.mdx`, renaming `home.md`/`index.md` → `index.mdx`
   - Copies adjacent `images/` subdirectory to `public/images/<relative-path>/`
   - Rewrites image references in each MDX file to the new absolute path
   - Strips corrupt JPEG EXIF segments from copied images
   - Injects `reading_time` into frontmatter
2. Update `_meta.json` generation:
   - For each directory, collect all pages and sort by `date` frontmatter (newest-first)
     if any page has a date; otherwise sort alphabetically by slug
   - Retain `home`/`index` as the first entry regardless of sort order
3. Update `write_posts_index()` to collect all pages that have a `date` field (not just
   those under `posts/<year>/`) and write them to `public/posts-index.json`
4. Update `write_posts_page()` to place the `PostIndex` page at a configurable location
   (default: `pages/posts/index.mdx`) or omit it if no dated posts exist
5. Verify that `examples/frww` still ingests correctly under the new generic walker
6. Add a test fixture with a flat/non-standard source layout and verify correct output

### Done when
`npm run ingest -- path/to/any/markdown/tree` produces a correctly structured and routed
site regardless of the source folder layout.


---

## Phase 3 — Page Components & Metadata Display

**Goal:** Tags, dates, and categories are visible in the UI; posts have a browsable index.

### Tasks
1. **PageHeader component** (`components/PageHeader.jsx`)
   - Displays: page title, publication date (formatted), reading time estimate
   - Reads from Nextra's `frontMatter` prop passed to each page
2. **TagList component** (`components/TagList.jsx`)
   - Renders `categories` and `tags` as styled chips/pills below the header
3. **PostIndex component** (`components/PostIndex.jsx`)
   - Lists all posts sorted by date (newest first)
   - Shows title, date, categories — links to post page
   - Used on `content/posts/index.mdx`
4. Wire components into the Nextra theme via `theme.config.js` `main` or page-level MDX imports
5. Add basic mobile-first CSS: readable body width, responsive images, chip styles

### Done when
A post page shows its header with date + reading time, category/tag chips below the title,
and the posts index lists all 16 posts in date order.


---

## Phase 4 — Build & Deployment

**Goal:** `next build` succeeds cleanly; the site can be previewed locally and published to
GitHub Pages.

### Tasks
1. Confirm `next build` + `next export` produces a valid `out/` directory
2. Add `base_path` support in `next.config.js` (read from `site.config.js`) to handle
   GitHub Pages project URLs (e.g. `username.github.io/repo`)
3. Add npm scripts to `package.json`:
   - `dev` → `next dev`
   - `build` → `next build`
   - `export` → `next export`
   - `preview` → `next start` (or `npx serve out/`)
4. Add `.github/workflows/deploy.yml`:
   - Trigger: push to `main`
   - Steps: `npm install` → `npm run build` → `npm run export` → push `out/` to `gh-pages`
5. Test full round-trip: build → export → `npx serve out/` → verify locally

### Done when
`npm run preview` serves the exported site locally with all pages, images, and navigation
working. The GitHub Actions workflow file is present and syntactically valid.


---

## Phase 5 — Testing

**Goal:** Key functionality is covered by automated tests.

### Tasks
1. Add `jest.config.js` + `@testing-library/react` for component tests
2. Unit tests (`tests/components/`):
   - `test_page_header` — renders title, date, reading time from frontmatter
   - `test_tag_list` — renders correct number of chips for given tags/categories
   - `test_post_index` — renders posts in descending date order
3. Build smoke test (`tests/build/`):
   - Assert `next build` exits 0
   - Assert `out/` contains expected page paths (index, posts, pages)
4. Add `npm test` script

### Done when
`npm test` passes all unit tests; build smoke test confirms a clean export.


---

## Phase 6 — Single-Command Automation

**Goal:** All steps from Phases 1–4 are reproducible via a single `npm run setup` command.
A fresh clone + two commands (`npm install && npm run setup`) should produce a running,
previewable site.

### Tasks
1. Create `scripts/setup.js`:
   - Accepts `--source <dir>` (content directory, default `examples/frww`) and optional
     `--build` flag to run `next build` after ingestion
   - Validates Node.js version and that `npm install` has been run
   - Validates required `site.config.js` fields — warns on missing values
   - Runs `scripts/ingest.js` with the resolved source directory
   - Optionally runs `next build` and reports pass/fail for each step
2. Add `"setup": "node scripts/setup.js"` npm script
3. Test: delete `pages/`, `public/images/`, and `node_modules/`; run `npm install &&
   npm run setup`; confirm the site builds cleanly from scratch
4. Enumerate any remaining steps that still require manual input (e.g. editing
   `site.config.js`) — these become the explicit agent interface boundary

### Done when
`npm install && npm run setup` on a fresh clone produces a clean build with all example
content. All remaining manual steps are explicitly listed and minimal.


---

## Phase 7 — Intelligence Features (deferred)

To be planned separately once Phase 1–6 are stable.

- **Semantic theming** — `(content_style, theme_mood)` → color palette via associative map
- **Logo generation** — seeded SVG composition from Bootstrap icons + background shapes
- **Semantic search** — per-page static JSON index, client-side query component

See [SPEC.md](SPEC.md) for current design notes on each.


---

## Conventions

- **Pipeline-agnostic**: this template accepts raw markdown directly — no upstream
  pre-processing required. Any tool (or no tool) can populate the content source.
- **Content is gitignored**: `pages/*.mdx`, `pages/posts/`, and `public/images/` are
  all generated by `npm run ingest` and never committed.
- **`examples/frww` is the reference source**: use it as the default ingest target
  during development (`npm run ingest` with no arguments).
- **Document before automating**: every manual step must be written down before it
  is scripted. See the Development Philosophy section in SPEC.md.
