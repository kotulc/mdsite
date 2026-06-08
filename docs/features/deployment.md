---
title: Deployment
categories:
  - features
tags:
  - github-actions
  - github-pages
readability: 80
steps: 5
related:
  - title: Configuration
    url: /configuration
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Deployment

mdsite deploys to GitHub Pages automatically via a single GitHub Actions workflow.

## Workflow overview

The workflow (`.github/workflows/deploy.yml`) runs on every push to `main`:

1. Checks out the repository
2. Installs Node.js 18 and npm dependencies (`npm ci`)
3. Runs `npm run ingest` against the configured content source
4. Runs `npm run build` — Next.js static export → `out/`
5. Pushes `out/` to the `gh-pages` branch via `peaceiris/actions-gh-pages`

## Configuration

Set these as **repository variables** under Settings → Secrets and variables → Actions → Variables:

| Variable | Example | Notes |
|----------|---------|-------|
| `CONTENT_SOURCE` | `docs` | Path to content relative to repo root (default: `docs`) |
| `BASE_PATH` | `/mdsite` | Required for project Pages repos; empty for root domains |

## Enabling GitHub Pages

1. Go to **Settings → Pages**
2. Set **Source** to the `gh-pages` branch, `/ (root)` folder
3. Push to `main` to trigger the first deploy

## Manual trigger

The workflow also supports `workflow_dispatch`, so you can re-deploy at any
time from the **Actions** tab without pushing a new commit.

## Local build

    npm run build      # production build → out/
    npm run preview    # serve the out/ directory locally
