---
title: Future Plans
date: 2026-03-08
categories:
  - roadmap
tags:
  - planning
  - phase-2
  - intelligence
complexity: 2
related:
  - title: Features
    url: /features
  - title: Components
    url: /components
  - title: Configuration
    url: /configuration
---

# Future Plans

Phase 1 of `mdsite` is complete. The core pipeline — markdown ingestion, metadata
display, navigation, theming, and GitHub Pages deployment — is fully functional.

Phase 2 focuses on intelligence features that go beyond static rendering
and begin to surface meaning from content.


## What's built (Phase 1)

- Markdown → MDX conversion with any source folder structure
- Image copying, path rewriting, and EXIF repair
- Reading time estimation, injected automatically into every page
- Tag and category chips; numeric frontmatter metrics in a sticky sidebar
- Nav ordering via `mdsite.yaml` and per-page frontmatter `order:`
- Per-page continuation feed (scroll to load the next page inline)
- Light / dark / system theme toggle in the navbar
- GitHub repo icon in the navbar, driven by `repo_url` in config
- GitHub Actions deployment workflow
- README auto-sync to the `/about` page on each default ingest run


## In development (Phase 2)

### Semantic search

A client-side search component that queries across all content by meaning, not just
keyword matching. The plan is to pre-compute a lightweight embedding index at build time
and serve it as a static JSON asset, keeping the site fully static with no server required.

Config hook (reserved): none yet — will be a new `search:` field in `mdsite.yaml`.

### Semantic theming

Derives a color palette and visual identity from content signals rather than manual
configuration. The upstream pipeline (`mdpub`) analyzes the content and writes
`content_style` and `theme_mood` into `mdsite.yaml`; the engine reads these to
select an appropriate Nextra `primaryHue` and accent palette.

Config hooks (reserved in `mdsite.yaml`):
```yaml
content_style: ""  # e.g. "technical", "narrative", "minimal"
theme_mood: ""     # e.g. "calm", "bold", "professional"
```

### Logo generation

A seeded SVG logo composed from a curated icon set and background shapes. Incrementing
`logo_seed` in `mdsite.yaml` regenerates the logo without any manual design work.
Intended for agent-driven site creation where no human designer is in the loop.

Config hook (reserved in `mdsite.yaml`):
```yaml
logo_seed: 1  # increment to regenerate
```

### Reduced external dependencies

The current stack leans on `nextra-theme-docs` for navigation, search, and layout.
Phase 2 will selectively replace Nextra internals with purpose-built components,
reducing the dependency footprint and giving tighter control over the rendered output.
`react-markdown` (used by the continuation feed) is the first candidate for replacement
with a lighter in-house renderer.


## Integrations

`mdsite` is the rendering end of the [`mdpub`](https://github.com/kotulc/nlp-mdpub)
pipeline. Phase 2 intelligence features are co-developed: `mdpub` generates the signals
(embeddings, style tags, theme hints) and this template consumes and renders them.
