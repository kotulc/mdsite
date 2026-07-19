---
title: Site Configuration
categories:
  - spec
---

# Site Configuration

All site-level settings are authored in `mdsite.yaml`. At build time the CLI generates
`site.config.js` from the YAML; both the ingest pipeline and Next.js/Nextra read from
the generated file at their respective run times.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Site name shown in browser tab and navbar logo |
| `description` | string | `''` | SEO meta description; per-page frontmatter overrides it |
| `repo_url` | string | `''` | GitHub repo URL; shows GitHub icon and "Edit this page" link when non-empty |
| `feed_url` | string | `''` | Section slug linked from the navbar feed icon |
| `footer` | string | `''` | Custom footer credits text |
| `theme_toggle` | `'navbar'`\|`'sidebar'` | `'navbar'` | Where the light/dark/system toggle appears |
| `toc` | boolean | `true` | Show right-side "On This Page" TOC column |
| `reading_time` | boolean | `true` | Show reading time in page headers and feeds |
| `theme` | object | see [Configuration](/configuration#theme) | Color palette, typeset, navbar/footer backgrounds |
| `enrich` | object | see [Metadata Contract](metadata) | Optional taggly NLP enrichment |
| `nav_order` | object | `{}` | Slug array to pin specific pages first; remaining pages auto-sort by date or alphabetically |
| `flatten` | string[] | `[]` | Directory paths to render as inline feeds; `'/'` = site root |
| `content` / `output` | path | `./docs` / `./dist` | Source and output directories, resolved relative to the YAML file |
| `components` / `assets` | path | `''` | Consumer component and static asset directories mirrored into the build |

Site sub-path deployment uses the `BASE_PATH` environment variable at build time
(handled by Next.js `basePath`), not a YAML field.

## Requirements

1. REQ-1: Generated redirect URLs resolve correctly under a `BASE_PATH` sub-path (via Next.js router basePath)
2. REQ-2: When `repo_url` is empty, the GitHub icon is hidden from the navbar
3. REQ-3: When `theme_toggle: 'navbar'`, the toggle appears in the navbar and Nextra's built-in dark mode toggle is hidden
4. REQ-4: `nav_order[dir]` slug array pins listed slugs first; remaining pages auto-sort newest-first if any have a `date` field, alphabetically otherwise
5. REQ-5: Each path in `flatten` causes its directory to render via `DirFeed`; non-index entries are hidden from the sidebar; `public/dir-feeds/<name>.json` is written

## Test Cases

REQ-1 is covered by `tests/build/ingest.test.js` (`test_auto_index_targets_first_sorted_page`).

REQ-4 is covered by `tests/build/ingest.test.js` (sort_entries suite: alpha, date auto-detection, and array cases).

REQ-5 is covered by `tests/build/ingest.test.js` (dir-feed output suite).

REQ-2, REQ-3 are verified manually:

- Set `repo_url: ''` → GitHub icon absent from navbar
- Set `theme_toggle: 'navbar'` → toggle appears in navbar, sidebar toggle absent
