---
title: Metadata Display
categories:
  - features
tags:
  - frontmatter
  - tags
  - reading-time
readability: 76
fields: 5
components: 5
related:
  - title: Getting Started
    url: /getting-started
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Metadata Display

Metadata is surfaced automatically on every page — no MDX imports required.
All metadata lives in the generated `public/page-meta.json`, which `theme.config.jsx`
reads by page url. Source frontmatter is optional input: when present it is converted
into the metadata record and stripped from the output page; pages without it get a
generated title, and the [enrichment step](/configuration#enrichment) can fill the
remaining fields from content.

## Metadata schema

| Field | Type | Effect |
|-------|------|--------|
| `title` | string | Page title shown in heading and nav |
| `date` | YYYY-MM-DD | Formatted date below title; enables date-based sorting |
| `description` | string | Per-page SEO meta description |
| `categories` | list | Category chips below the title |
| `tags` | list | Tag chips below the title |
| `reading_time` | integer | Computed by the pipeline; displays as "N min read" |

Example source frontmatter (all fields land in `page-meta.json`):

```yaml
---
title: My Post
date: 2026-01-15
categories:
  - tutorial
tags:
  - markdown
  - nextjs
---
```

## Components

**`PageHeader`** renders the formatted date and reading time on a single line,
separated by a center dot. Returns null when neither field is present.

**`TagList`** renders categories (blue) and tags (gray) as pill chips.
Both arrays are optional; the component returns null when both are empty.

**`SiteFooter`** renders the page footer (copyright, build timestamp, credits).
Edit `components/SiteFooter.jsx` directly to customize the footer across all pages.

## Metrics

When `enrich.metrics` is configured, the build computes polarity, spam, and toxicity
scores for each page and its `##` sections and writes them to `public/page-meta.json`,
keyed by page url. Components can fetch the file at `${basePath}/page-meta.json`.
See the [Metadata Contract](/specifications/metadata) spec for the schema.

