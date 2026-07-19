# mdsite

A portable static site generator for markdown — drop it into any CI/CD pipeline as a build step.

Point it at a directory of markdown files with a YAML config, and it outputs a fully-built
static website ready to deploy anywhere.


## Purpose

`mdsite` is a Next.js + Nextra-based site generator designed to work at the end of a markdown
publishing pipeline. The engine is packaged as a Docker image: mount your content and a YAML
config, get a `dist/` folder. Publishing is left to the caller.

It is also designed to be configured as easily by an AI agent as by a human — a small YAML
config file is all that's required to stand up a new site.


## How It Works

1. Write markdown content in any folder structure
2. Provide an `mdsite.yaml` config pointing at that content
3. Run the CLI or Docker container to ingest and build
4. A fully-built static site appears in your output directory

See [Getting Started](/getting-started) to have a site running in minutes,
or browse the [Features](/features) section for the full capability overview.


## Features

- **Markdown → MDX** — automatic conversion, any folder structure
- **Images** — copied and path-rewritten automatically; corrupt EXIF data stripped
- **Reading time** — estimated and injected into every page's frontmatter
- **Tags and categories** — rendered as pill chips below each title and in the sidebar
- **Sidebar metrics** — any numeric frontmatter field surfaces as a labeled score
- **Nav ordering** — configure page and folder order via `nav_order` in YAML or `order:` in frontmatter
- **Per-page feed** — scroll to the bottom of any page to load the next one inline
- **Theme toggle** — light / dark / system toggle in the navbar
- **GitHub header icon** — circular GitHub repo link, auto-shown from `repo_url`
- **YAML config** — single file drives the entire build
- **Docker** — packaged as a container for use in any CI/CD pipeline


## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node.js)

### Install

```bash
npm install
```

### Local Development

The fastest path is to edit `site.config.js` directly and use the npm scripts:

```bash
npm run ingest docs        # ingest from docs/ (default)
npm run dev                # development server with hot reload
npm run build              # production build → dist/
npm run preview            # serve dist/ locally
npm test                   # run all tests
```

### CLI Usage

For config-driven builds (required for Docker and CI), use the CLI:

```bash
node scripts/cli.js build --config mdsite.yaml
```

| Flag | Description |
|---|---|
| `--config <path>` | **(required)** Path to an `mdsite.yaml` config file |
| `--content <path>` | Override the content directory from YAML |
| `--output <path>` | Override the output directory from YAML |

The CLI reads the YAML, ingests content, generates `site.config.js`, runs Next.js build,
and exits with the build's exit code.


## mdsite.yaml Reference

Full schema with defaults:

```yaml
# Required
title: My Site

# Optional — site identity
description: ""              # SEO meta description added to every page
repo_url: ""                 # shows a GitHub icon in the navbar when set
feed_url: ""                 # slug of the section used as the per-page feed
footer: ""                   # custom footer credits; empty keeps the default

# Optional — layout
theme_toggle: navbar         # "navbar" or "sidebar"
toc: true                    # show table of contents

# Optional — theme presets (see docs/configuration.md for all values)
theme:
  color: default             # accent palette: default, slate, blue, emerald, rose, ...
  typeset: sans              # body font stack: sans, serif, humanist, geometric, mono
  navbar: ""                 # navbar background: "primary" (theme tint) or any CSS color
  footer: ""                 # footer background: "primary" (theme tint) or any CSS color

# Optional — ingest behavior
flatten: []                  # list of section slugs to flatten (no subfolder in nav)
nav_order: {}                # map of section slug → ordered list of page slugs

# Optional — NLP enrichment via a local taggly instance (github.com/kotulc/taggly)
# Output lands in public/page-meta.json; runs only with --enrich or on_build: true
enrich:
  url: ""                    # e.g. http://127.0.0.1:8000; empty disables enrichment
  fields: [description, tags, categories]   # metadata generated when the source has none
  metrics: []                # optional section scores + document mean: polarity, spam, toxicity
  strict: true               # fail the build if the service is unreachable
  on_build: false            # true: enrich every CLI build (else only with --enrich)

# Paths — resolved relative to this file
content: ./docs              # source markdown directory
output: ./dist               # output directory for built site
```

### BASE_PATH environment variable

If your site is served from a subpath (e.g. `https://username.github.io/repo-name`),
set the `BASE_PATH` environment variable at build time — do not add it to `mdsite.yaml`.

```bash
BASE_PATH=/repo-name node scripts/cli.js build --config mdsite.yaml
# or via Docker:
docker run --rm -e BASE_PATH=/repo-name -v $(pwd):/workspace ghcr.io/kotulc/mdsite build --config /workspace/mdsite.yaml
```

For GitHub Pages the deploy workflow reads `BASE_PATH` from a repository Actions variable
(Settings → Secrets and variables → Actions → Variables). Local builds and previews need
no base path — `npx serve dist` works as-is.


## Docker

### Build the image

```bash
docker build -t mdsite .
```

### Run a build

```bash
# Linux / macOS
docker run --rm \
  -v $(pwd):/workspace \
  mdsite build --config /workspace/mdsite.yaml

# Windows (PowerShell)
docker run --rm `
  -v ${PWD}:/workspace `
  mdsite build --config /workspace/mdsite.yaml
```

The container mounts your workspace, reads `mdsite.yaml`, and writes the built site to the
`output` path defined in the YAML (default: `./dist` relative to the YAML file).

### Using from another project

Pull the published image from GHCR and add a build step to your CI:

```yaml
- name: Build docs
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/workspace \
      ghcr.io/kotulc/mdsite:latest \
      build --config /workspace/mdsite.yaml
```

Ship an `mdsite.yaml` in your repo root pointing at your docs folder:

```yaml
title: My Project
repo_url: https://github.com/username/my-project
content: ./docs
output: ./dist
```

If the site is served from a subpath, pass `BASE_PATH` as an environment variable at
build time (see above) — it does not belong in `mdsite.yaml`.

Then add your own publish step (GitHub Pages, Vercel, S3, etc.) after the build step.


## Publishing to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically
on every push to `main`. One-time setup:

**1. Enable GitHub Pages**
- Repository **Settings → Pages → Build and deployment**
- Set **Source** to `GitHub Actions` → **Save**

**2. Set BASE_PATH** *(project pages repos only)*
- **Settings → Secrets and variables → Actions → Variables → New repository variable**
- Name: `BASE_PATH`, Value: `/repo-name` (e.g. `/mdsite`)

**3. Push to main**

```bash
git push
```

Go to the **Actions** tab to watch progress. Your site will be live at:
```
https://<username>.github.io/<repo-name>/
```


## Publishing the Docker Image

Tag a release to publish the image to GHCR automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The publish workflow (`.github/workflows/publish-image.yml`) builds and pushes:
- `ghcr.io/kotulc/mdsite:latest`
- `ghcr.io/kotulc/mdsite:v1.0.0`
