---
title: Metadata Contract
categories:
  - spec
---

# Metadata Contract

Defines the per-page metadata record, where each field comes from, and where it lands
in the built site. All metadata lives in generated JSON — output pages carry **no
frontmatter**. Source frontmatter is optional input: when present it is parsed,
converted into the metadata record, and stripped from the generated page. Components
program against this contract; they never care whether a value was hand-written or
generated.

## Page record

Every content page produces one record in `public/page-meta.json`, keyed by page url:

| Field | Type | Source (first match wins) |
|-------|------|---------------------------|
| `slug` | string | Filename (kebab-case, `home`/`index` → `index`) |
| `url` | string | Derived from path relative to the content root |
| `title` | string | frontmatter → first `#` heading → title-cased slug |
| `date` | string | frontmatter (`YYYY-MM-DD`) → empty |
| `description` | string | frontmatter → enrichment `/desc` → empty |
| `categories` | list | frontmatter → enrichment `/tag` topics → `[]` |
| `tags` | list | frontmatter → enrichment `/key` keywords → `[]` |
| `reading_time` | number | Computed from word count (always derived) |
| `metrics` | object | Enrichment only — document-level scores (see below) |
| `sections` | list | Enrichment only — per-`##`-section scores (see below) |
| *(any other key)* | — | Extra source frontmatter keys are carried through verbatim |

Explicit frontmatter always wins over generated values.

## Landing spots

| Output | Contents | Consumed by |
|--------|----------|-------------|
| `public/page-meta.json` | Full record per page url | Theme (build-time import: title meta, `PageHeader`, `TagList`, SEO description) and any component (runtime fetch at `${basePath}/page-meta.json`) |
| `pages/**/*.mdx` | Frontmatter-free content with a guaranteed h1 | Nextra rendering |
| `pages/**/_meta.json` | `slug` → `title` (nav order/labels) | Nextra sidebar |
| `public/dir-feeds/<dir>.json` | Lean record + extracted `content` per entry | `DirFeed` and consumer feed components |

`page-meta.json` is regenerated on every ingest (with or without enrichment), so the
theme's build-time import always resolves.

## Metrics

Written only when `enrich.metrics` is configured. Scores are computed **per `##`
section** (the whole page acts as a single unnamed section when it has no `##`
headings), then aggregated to the document level by mean:

```json
{
  "/about": {
    "title": "About",
    "tags": ["markdown", "nextjs"],
    "metrics": {
      "polarity": { "negative": 0.005, "neutral": 0.97, "positive": 0.025 },
      "spam": 0.06,
      "toxicity": 0.001
    },
    "sections": [
      { "heading": "Purpose", "polarity": { "...": 0 }, "spam": 0.07, "toxicity": 0.001 }
    ]
  }
}
```

## Enrichment

Optional; requires `enrich.url` in `mdsite.yaml` pointing at a running
[taggly](https://github.com/kotulc/taggly) instance, and runs only when requested:
the CLI `--enrich` flag enables it per build, or `enrich.on_build: true` enables it
for every build (including `npm run ingest`, which reads `mdsite.yaml` when present).
When enrichment is configured but not requested, the build logs that it was skipped.
When enrichment runs and the service is unreachable, the build fails by default
(`strict: false` downgrades to a warning that skips enrichment). Routes:

| Field / metric | taggly route | Response mapping |
|----------------|--------------|------------------|
| `description` | `POST /desc` | `description` |
| `tags` | `POST /key?top_n=8` | `keywords` |
| `categories` | `POST /tag` | `tags.topics` (top 3) |
| `polarity` | `POST /polar` | `scores` |
| `spam` | `POST /spam` | `score` |
| `toxicity` | `POST /tox` | `score` |

The request body is always `{ "content": <markdown text> }` with imports, JSX tags,
and the leading h1 stripped. Metric routes receive each section's text reduced to
plain prose (code fences and markdown syntax removed) and truncated to 1500
characters — taggly's classifier models reject inputs beyond ~512 tokens.

## Requirements

1. REQ-1: A page with no frontmatter builds successfully; its title derives from the first heading
2. REQ-2: Generated pages contain no frontmatter; all source frontmatter keys appear in page-meta.json
3. REQ-3: Enrichment only fills fields absent from the record; explicit values are never overwritten
4. REQ-4: Without `--enrich`/`on_build`, the pipeline makes no network calls; page-meta.json is still written
5. REQ-5: With enrichment requested and the service unreachable, the build fails by default (`strict: false` warns and skips)
6. REQ-6: `enrich.metrics` produces per-section scores and their document-level mean in page-meta.json
7. REQ-7: Unknown `enrich.fields`/`enrich.metrics` names fail config loading with the valid names listed

## Test Cases

- `test_first_h1_used_as_title` — REQ-1
- `test_pages_have_no_frontmatter` / `test_page_meta_converts_frontmatter` — REQ-2
- `test_enrich_fields_fills_missing_only` / `test_enrich_fields_respects_record` — REQ-3
- `test_page_meta_written_without_enrichment` — REQ-4
- `test_check_service_unreachable_throws` — REQ-5
- `test_page_metrics_sections_and_mean` — REQ-6
- `test_enrich_invalid_field_throws` / `test_enrich_invalid_metric_throws` — REQ-7
