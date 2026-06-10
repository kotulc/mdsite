---
title: Configuration
categories:
  - reference
tags:
  - yaml-config
  - github-pages
  - env-vars
readability: 78
fields: 14
related:
  - title: Getting Started
    url: /getting-started
  - title: Deployment
    url: /features/deployment
---

# Configuration

All site-level settings live in `mdsite.yaml` at your project root.
The CLI reads this file at build time and generates the internal `site.config.js`
consumed by Next.js and Nextra.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | *(required)* | Site name — shown in the logo, footer, and page titles |
| `base_url` | string | *(required)* | Deployed domain, e.g. `https://user.github.io` |
| `base_path` | string | `""` | Subpath for GitHub Pages repos, e.g. `/repo-name` |
| `repo_url` | string | `""` | GitHub repo link shown as an icon in the header; leave empty to hide |
| `feed_url` | string | `""` | Slug of the section used as the per-page continuation feed |
| `theme_toggle` | string | `"navbar"` | Where the light/dark toggle appears: `"navbar"` or `"footer"` |
| `toc` | boolean | `true` | Right sidebar: "On This Page" section navigation |
| `meta_sidebar` | boolean | `true` | Right sidebar: tags, metrics, and related links below the TOC |
| `ingest_readme` | boolean | `false` | Sync `README.md` → `/about` page on each build |
| `flatten` | list | `[]` | Section slugs rendered as inline feeds rather than individual pages |
| `nav_order` | object | `{}` | Explicit nav ordering per directory — see below |
| `content_style` | string | `""` | Phase 2 — semantic style hint, e.g. `"technical"` |
| `theme_mood` | string | `""` | Phase 2 — visual tone hint, e.g. `"calm"` |
| `logo_seed` | integer | `1` | Phase 2 — increment to regenerate the procedural logo |
| `content` | path | `./docs` | Source markdown directory (resolved relative to this file) |
| `output` | path | `./dist` | Output directory for the built site (resolved relative to this file) |

## Example

```yaml
title: My Site
base_url: https://myuser.github.io
base_path: /my-repo
repo_url: https://github.com/myuser/my-repo
feed_url: updates
content: ./docs
output: ./dist
```

## Nav ordering

By default the pipeline sorts pages newest-first by `date`, or alphabetically.
Use `nav_order` to define explicit ordering at any directory level:

```yaml
nav_order:
  "": [getting-started, configuration, features]
  features: [content-pipeline, metadata, deployment]
```

The key `""` refers to the source root. Other keys are subdirectory slugs.
Folders and pages can be mixed. Slugs not listed append alphabetically after
the explicit entries.

For individual pages without a full directory listing, add `order: N` to the
page's frontmatter instead — lower numbers appear first.

## GitHub Actions variables

The deployment workflow reads two optional repository variables.
Set them under **Settings → Secrets and variables → Actions → Variables**.

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTENT_SOURCE` | `docs` | Path to content directory, relative to repo root |
| `BASE_PATH` | _(empty)_ | GitHub Pages base path, passed to Next.js at build time |

`BASE_PATH` is required whenever your site lives at a subpath (e.g. `username.github.io/repo-name`).
Leave it empty for root domain deployments.

## CLI overrides

The `--content` and `--output` flags override the corresponding YAML fields at runtime:

```bash
node scripts/cli.js build --config mdsite.yaml \
  --content /path/to/content \
  --output /path/to/output
```
