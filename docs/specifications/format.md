---
title: Spec Format
categories:
  - spec
---

# Feature Specification

Feature specifications for mdsite. Each spec defines the purpose, requirements,
and named test cases for a feature area.

## Development Process

1. Write a spec here in `docs/specs/<feature>.md`
2. Implement the test cases in `tests/` (tests first — they should fail initially)
3. Implement the feature until all tests pass
4. The spec page appears in the site automatically after running `npm run ingest`

## Markdown Format

```markdown
---
title: Feature Name
categories:
  - spec
---

# Feature Name

One-paragraph description of purpose.

## Requirements

1. REQ-1: Description
2. REQ-2: Description

## Test Cases

- `test_<function>_<case>` — what it verifies (maps to REQ-N)
```

## Current Specs

- [Ingest Pipeline](ingest-pipeline) — content transformation and output generation
- [Metadata Contract](metadata) — the per-page metadata record, sources, and landing spots
- [Navtree Naming](navtree-naming) — how page and directory labels are derived for navigation
- [Page Metadata](page-metadata) — date, reading time, category and tag chips
- [Post Index](post-index) — reverse-chronological dated post listing
- [Site Configuration](site-configuration) — all `mdsite.yaml` fields and their effects
