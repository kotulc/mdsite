---
title: Getting Started
categories:
  - guide
tags:
  - setup
  - npm
  - configuration
readability: 85
complexity: 2
related:
  - title: Configuration
    url: /configuration
  - title: Features
    url: /features
---

# Getting Started

## Prerequisites

- Node.js 18 or later
- npm (bundled with Node.js)

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure the site**

Create an `mdsite.yaml` in your project root (or copy the included one):

```yaml
title: My Site
repo_url: https://github.com/username/repo-name
content: ./docs
output: ./dist
```

If deploying to a subpath (e.g. GitHub Pages project repo), set `BASE_PATH=/repo-name`
as an environment variable at build time — see [Configuration](/configuration).

See [Configuration](/configuration) for the full field reference.

**3. Organize your content**

Place markdown files in any directory. Subdirectories become URL segments.
An `index.md` at any level becomes that section's landing page.

```
docs/
├── index.md
├── about.md
├── images/
└── posts/
    └── 2026/
        └── my-first-post.md
```

**4. Build the site**

```bash
node scripts/cli.js build --config mdsite.yaml
```

This ingests content, rewrites image paths, generates navigation files,
and produces a fully-built static site in `dist/`.

**5. Preview locally**

```bash
npm run preview    # serve dist/ locally
npm run dev        # development server with hot reload
```

## Local development workflow

For iterating on content without a full build each time:

```bash
npm run ingest docs    # ingest from docs/ (default)
npm run dev            # hot-reload dev server
```

## Frontmatter fields

Add these to the top of any markdown file to control how it is displayed:

```yaml
---
title: My Page
date: 2026-01-15
categories:
  - tutorial
tags:
  - markdown
---
```

| Field | Required | Notes |
|-------|----------|-------|
| `title` | recommended | Falls back to the file slug |
| `date` | optional | Enables date sorting and the post index |
| `categories` | optional | Rendered as blue chip pills |
| `tags` | optional | Rendered as gray chip pills |
| `reading_time` | auto | Injected by the pipeline — do not set manually |
