---
title: Metadata Contract
categories:
  - spec
---

# Metadata Contract

Defines the per-page metadata record, where each field comes from, and where it lands
in the built site. Components — built-in or consumer-supplied — program against this
contract; they never care whether a value was hand-written or generated.

## Page record

Every content page produces one record during ingest:

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

Pages without frontmatter are valid input: ingest creates the block (title from the
first heading) and enrichment fills the remaining fields when configured. Explicit
frontmatter always wins over generated values.

## Landing spots

| Output | Contents | Consumed by |
|--------|----------|-------------|
| `pages/**/*.mdx` frontmatter | Full record fields | `PageHeader`, `TagList`, SEO description via `useConfig()` |
| `pages/**/_meta.json` | `slug` → `title` (nav order/labels) | Nextra sidebar |
| `public/dir-feeds/<dir>.json` | Record + extracted `content` per entry | `DirFeed` and consumer feed components |
| `public/page-meta.json` | Metrics per page url (see below) | Future metrics components (fetch at `${basePath}/page-meta.json`) |

## Metrics record

Written only when `enrich.metrics` is configured. Keyed by page url; scores are
computed for the whole page and for each `##` section:

```json
{
  "/about": {
    "polarity": { "negative": 0.0, "neutral": 0.46, "positive": 0.54 },
    "spam": 0.04,
    "toxicity": 0.001,
    "sections": [
      { "heading": "Install", "polarity": { "...": 0 }, "spam": 0.02, "toxicity": 0.0 }
    ]
  }
}
```

## Enrichment

Optional; enabled by `enrich.url` in `mdsite.yaml` pointing at a running
[taggly](https://github.com/kotulc/taggly) instance. The build fails if the service is
configured but unreachable (`strict: false` downgrades to a warning that skips
enrichment). Field routes:

| Field / metric | taggly route | Response mapping |
|----------------|--------------|------------------|
| `description` | `POST /desc` | `description` |
| `tags` | `POST /key?top_n=8` | `keywords` |
| `categories` | `POST /tag` | `tags.topics` (top 3) |
| `polarity` | `POST /polar` | `scores` |
| `spam` | `POST /spam` | `score` |
| `toxicity` | `POST /tox` | `score` |

The request body is always `{ "content": <markdown text> }` with frontmatter, imports,
JSX tags, and the leading h1 stripped. Metric routes receive at most the first 1500
characters of their text — taggly's classifier models reject longer inputs.

## Requirements

1. REQ-1: A page with no frontmatter builds successfully; its title derives from the first heading
2. REQ-2: Enrichment only fills fields absent from frontmatter; explicit values are never overwritten
3. REQ-3: With `enrich.url` unset, the pipeline makes no network calls and output matches pre-enrichment behavior
4. REQ-4: With `enrich.url` set and the service unreachable, the build fails by default (`strict: false` warns and skips)
5. REQ-5: `enrich.metrics` produces page and per-`##`-section scores in `public/page-meta.json`
6. REQ-6: Unknown `enrich.fields`/`enrich.metrics` names fail config loading with the valid names listed

## Test Cases

- `test_ensure_fm_creates_block_from_h1` — REQ-1
- `test_enrich_fields_fills_missing_only` — REQ-2
- `test_enrich_fields_respects_frontmatter` — REQ-2
- `test_check_service_unreachable_throws` — REQ-4
- `test_page_metrics_document_and_sections` — REQ-5
- `test_enrich_invalid_field_throws` / `test_enrich_invalid_metric_throws` — REQ-6
