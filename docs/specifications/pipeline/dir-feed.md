---
title: Directory Feed
categories:
  - spec
---

The `flatten` config field allows any directory to be rendered as a single
scrolling inline feed instead of individual navigable pages.

## Config

```yaml
# mdsite.yaml
flatten:
  - updates  # dir paths to render as inline feeds; '/' = site root
```

`'/'` maps to `rel = ''` (the source root) internally.

## Behavior

For each directory in `siteConfig.flatten`:

1. Individual `.mdx` files are still generated — pages remain deep-linkable by URL
2. `public/dir-feeds/<name>.json` is written with one entry per page:
   `{ url, title, date, categories, tags, reading_time, content }`
3. The directory's `index.mdx` renders `<DirFeed dir="<rel>" />` instead of an auto-redirect
4. All non-index entries in `_meta.json` get `{ display: 'hidden' }` — sidebar shows only the directory

JSON filename: `rel.replace(/\//g, '-') || 'root'`
→ `updates` → `updates.json`, root (`''`) → `root.json`

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Absolute page URL (without basePath) |
| `title` | string | Page title from frontmatter |
| `date` | string | ISO date string or `''` |
| `categories` | string[] | From frontmatter `categories` |
| `tags` | string[] | From frontmatter `tags` |
| `reading_time` | number | Estimated minutes |
| `content` | string | Body text (frontmatter, H1, and imports stripped) |

## Requirements

1. REQ-1: Each path in `flatten` produces a `public/dir-feeds/<name>.json` file after ingest
2. REQ-2: The directory's `index.mdx` contains `<DirFeed dir="<rel>" />`
3. REQ-3: Non-index entries in the directory's `_meta.json` have `{ display: 'hidden' }`
4. REQ-4: Individual page URLs remain accessible (pages are still generated as `.mdx` files)

## Test Cases

REQ-1, REQ-2, REQ-3 are covered by `tests/build/ingest.test.js` (dir-feed output suite):
`test_dir_feed_file_exists`, `test_dir_feed_has_required_fields`,
`test_dir_feed_index_in_meta_is_string`, `test_dir_feed_entries_hidden_in_meta`.
