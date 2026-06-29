---
title: Navtree Naming
categories:
  - spec
---

# Navtree Naming

Rules for how each entry in the site's navigation tree is labelled. Labels are
written into each directory's `_meta.json` by the ingest pipeline.

## Requirements

1. REQ-1: A page's navtree label is its `title` frontmatter value when present; otherwise `slug_to_title(filename_stem)` (e.g., `my-page.md` → "My Page", `home.md` → "Home")
2. REQ-2: `home.md` and `index.md` both produce `index.mdx`, but their title fallback derives from the original filename stem — `home.md` → "Home", `index.md` → "Index"
3. REQ-3: A directory's navtree label is its index page's title; when no index page exists it falls back to `slug_to_title(directory_name)`
4. REQ-4: Auto-generated redirect `index.mdx` pages (created when no index source exists) are hidden from the navtree via `{ display: 'hidden' }` in `_meta.json`

## Test Cases

`tests/build/ingest.test.js`

- `test_nav_label_from_frontmatter_title` — frontmatter `title` is used as navtree label (REQ-1)
- `test_nav_label_fallback_slug_to_title` — label derived from filename stem when no frontmatter title (REQ-1)
- `test_nav_label_home_md` — `home.md` with no frontmatter title produces label "Home" not "index" (REQ-2)
- `test_nav_label_index_md` — `index.md` with no frontmatter title produces label "Index" (REQ-2)
- `test_nav_label_dir_from_index_title` — directory label matches its index page title (REQ-3)
- `test_pages_auto_redirect_index_hidden_in_root_meta` — auto-redirect index hidden in root `_meta.json` (REQ-4)
- `test_pages_auto_redirect_index_hidden_in_features_meta` — auto-redirect index hidden in nested `_meta.json` (REQ-4)
