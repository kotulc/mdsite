---
title: Metadata Sidebar
categories:
  - spec
---

# Metadata Sidebar

`MetaSidebar` renders in Nextra's right TOC column (via `toc.extraContent`) below the
page's heading navigation. It displays the current page's categories, tags, numeric
frontmatter metrics, and related links — all sourced from `useConfig().frontMatter`.
Enable or disable globally via `meta_sidebar` in `mdsite.yaml`.

## Requirements

1. REQ-1: The sidebar renders categories and tags as chips when either is non-empty
2. REQ-2: Any numeric frontmatter field not in the reserved set (`title`, `date`, `categories`, `tags`, `reading_time`, `related`) is shown as a labeled metric row with key and value
3. REQ-3: Underscores in metric key names are replaced with spaces for display
4. REQ-4: Related links from frontmatter `related:` are rendered as clickable links
5. REQ-5: The component returns nothing when categories, tags, metrics, and related are all empty
6. REQ-6: Setting `meta_sidebar: false` in `mdsite.yaml` disables the sidebar globally

## Test Cases

No automated tests yet — MetaSidebar relies on Nextra's `useConfig()` hook which
requires a full Nextra render context. Tests should be added when a mock context
strategy is established.

Manually verify:

- A page with `categories`, `tags`, numeric fields, and `related` shows all four sections (REQ-1, REQ-2, REQ-4)
- A page with `readability: 88` displays "readability 88" in the Metrics section (REQ-2, REQ-3)
- A page with no relevant frontmatter renders an empty sidebar (REQ-5)
- Setting `meta_sidebar: false` in mdsite.yaml removes the sidebar from all pages (REQ-6)
