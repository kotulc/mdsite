---
title: Deployment
categories:
  - features
tags:
  - github-actions
  - github-pages
  - docker
readability: 80
steps: 3
related:
  - title: Configuration
    url: /configuration
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Deployment

mdsite outputs a static `dist/` directory that can be deployed to any static host.
The project ships a GitHub Pages workflow; Docker enables deployment from any CI/CD system.

## GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) runs on every push to `main`
and uses the standard `actions/deploy-pages` two-job pattern.

**Workflow overview:**
1. Checks out the repository and installs dependencies (`npm ci`)
2. Runs ingest against the configured content source
3. Runs `npm run build` — Next.js static export → `dist/`
4. Uploads `dist/` as a Pages artifact
5. A separate deploy job publishes the artifact to GitHub Pages

### One-time setup

**1. Enable GitHub Pages**
- Repository **Settings → Pages → Build and deployment**
- Set **Source** to `GitHub Actions` → **Save**

**2. Set BASE_PATH** *(project pages repos only)*
- **Settings → Secrets and variables → Actions → Variables → New repository variable**
- Name: `BASE_PATH`, Value: `/repo-name` (e.g. `/mdsite`)

**3. Push to main** — the workflow runs automatically.

Go to the **Actions** tab to watch progress. Your site will be live at:
```
https://<username>.github.io/<repo-name>/
```

The workflow also supports `workflow_dispatch`, so you can re-deploy at any
time from the Actions tab without pushing a new commit.

### Repository variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTENT_SOURCE` | `docs` | Path to content directory, relative to repo root |
| `BASE_PATH` | _(empty)_ | Required for project pages repos; empty for root domains |


## Docker

The Docker image runs the full build pipeline in a container. Mount your workspace
and the container writes to the output path in your `mdsite.yaml`.

```bash
# Linux / macOS
docker run --rm \
  -v $(pwd):/workspace \
  ghcr.io/kotulc/mdsite:latest \
  build --config /workspace/mdsite.yaml

# Windows (PowerShell)
docker run --rm `
  -v ${PWD}:/workspace `
  ghcr.io/kotulc/mdsite:latest `
  build --config /workspace/mdsite.yaml
```

### Using Docker in CI/CD

Add the build step to your workflow before your publish step:

```yaml
- name: Build docs
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/workspace \
      ghcr.io/kotulc/mdsite:latest \
      build --config /workspace/mdsite.yaml

- name: Publish
  # your own publish step here (Pages, Vercel, S3, etc.)
```

### Publishing the image

Tag a release to publish to GHCR automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers `.github/workflows/publish-image.yml`, which builds and pushes
`ghcr.io/kotulc/mdsite:latest` and `ghcr.io/kotulc/mdsite:v1.0.0`.


## Local build

```bash
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
```
