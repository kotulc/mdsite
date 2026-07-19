/**
 * Content ingestion pipeline.
 * Recursively mirrors any markdown source tree into the Next.js site content directory (pages/):
 *   - Renames .md → .mdx (home.md or index.md at any level → index.mdx)
 *   - Strips frontmatter from output pages — all metadata (frontmatter, derived, and
 *     optional NLP enrichment) is written to public/page-meta.json keyed by page url
 *   - Ensures each page has an h1 (title from frontmatter, first heading, or slug)
 *   - Auto-generates index.mdx (redirect to first sorted page) when none exists
 *   - Copies images/ subdirectories to public/images/<rel-path>/
 *   - Rewrites relative image refs to absolute /images/<rel-path>/... URLs
 *   - Strips corrupt EXIF segments from copied JPEGs
 *   - Auto-generates _meta.json at each level; sort order:
 *       nav_order config > date (newest-first) > alpha
 *   - For flatten[] directories: writes public/dir-feeds/<name>.json and generates
 *     a DirFeed index.mdx; individual pages remain deep-linkable but hidden in sidebar
 *
 * Usage: node scripts/ingest.js [source-dir]
 *        Default source-dir: docs/
 * Exports: parse_fm, sort_entries, extract_content, auto_index, norm_path, run
 */
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { strip_dir } = require('./fix-exif')
const enrich = require('./enrich')


const ROOT    = path.join(__dirname, '..')
const PAGES   = path.join(ROOT, 'pages')
const PUB_IMG = path.join(ROOT, 'public', 'images')
const PUB_DIR = path.join(ROOT, 'public')
const META    = path.join(PUB_DIR, 'page-meta.json')


// Module-level config: set by run(config), falls back to site.config.js for local dev
let _config = null
function get_config() { return _config || require('../site.config') }

// Per-page metadata collected during the walk, written to public/page-meta.json by run()
let _page_meta = {}


// --- Text helpers ---

function parse_fm(content) {
  /** Parse a YAML frontmatter block into an object ({} when absent or invalid).
   *  JSON_SCHEMA keeps dates and other scalars as plain strings. */
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  try { return yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) || {} } catch { return {} }
}


function strip_fm(content) {
  /** Remove the frontmatter block and any leading blank lines. */
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/^\s*\n/, '')
}


function first_h1(content) {
  /** Return the first h1 heading text outside code fences, or ''. */
  const match = content.replace(/```[\s\S]*?```/g, '').match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}


function reading_time(content) {
  /** Estimate reading time in minutes from MDX content. */
  const text = content.replace(/```[\s\S]*?```/g, '')
                      .replace(/[#*`[\]()!|>]/g, ' ')
                      .replace(/\s+/g, ' ').trim()
  const words = text.split(' ').filter(w => w.length > 1).length
  return Math.max(1, Math.round(words / 200))
}


function rewrite_img_refs(content, img_url) {
  /** Replace ](images/ with ](<img_url>/ in markdown content. */
  return content.replace(/\]\(images\//g, `](${img_url}/`)
}


function rewrite_md_links(content, url_base) {
  /** Rewrite relative markdown links to absolute paths using the page URL base.
   *  Skips image links (![...]), already-absolute hrefs, and fragment-only refs. */
  return content.replace(
    /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text, raw_href) => {
      const space = raw_href.search(/\s/)
      const href = space < 0 ? raw_href : raw_href.slice(0, space)
      const rest = space < 0 ? '' : raw_href.slice(space)
      if (/^(\/|https?:|mailto:|#)/.test(href)) return match
      const [link, ...frags] = href.split('#')
      const fragment = frags.length ? '#' + frags.join('#') : ''
      return `[${text}](${path.posix.join(url_base, link)}${fragment}${rest})`
    }
  )
}


function ensure_h1(mdx_path, title) {
  /** Prepend # title heading if the file's body has no h1 outside code fences.
   *  Handles files with or without a frontmatter block. */
  const content = fs.readFileSync(mdx_path, 'utf8')
  if (first_h1(strip_fm(content))) return
  const updated = /^---/.test(content)
    ? content.replace(/(^---[\s\S]*?---\r?\n)/, `$1\n# ${title}\n\n`)
    : `# ${title}\n\n${content}`
  fs.writeFileSync(mdx_path, updated)
}


function extract_content(mdx) {
  /** Strip frontmatter, imports, bare JSX tags, and leading H1 from MDX.
   *  Processes line-by-line to skip content inside code fences. */
  const body = strip_fm(mdx)
  let in_fence = false
  const lines = body.split('\n').filter(line => {
    if (/^```/.test(line)) { in_fence = !in_fence; return true }
    if (in_fence) return true
    if (/^import\s/.test(line)) return false
    if (/^<[A-Z][^\n>]*\/>\s*$/.test(line)) return false
    return true
  })
  return lines.join('\n').trimStart().replace(/^#\s+.+\r?\n?/, '').trim()
}


function slug_to_title(s) {
  /** Convert a slug (kebab or snake case) to a capitalized title. */
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function norm_path(p) {
  /** Strip leading and trailing slashes; '/' and '' both become ''. */
  return (p || '').replace(/^\/+|\/+$/g, '')
}


// --- Sorting and navigation ---

function auto_sort(entries) {
  /** Sort entries: newest-first by date when any entry has a date, else alphabetical.
   *  Undated entries always sort alphabetically after dated entries. */
  const dated   = entries.filter(e => e.date)
  const undated = entries.filter(e => !e.date)
  if (!dated.length) return [...entries].sort((a, b) => a.slug.localeCompare(b.slug))
  return [
    ...dated.sort((a, b)   => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)),
    ...undated.sort((a, b) => a.slug.localeCompare(b.slug)),
  ]
}


function sort_entries(entries, rel) {
  /** Sort entries for a directory.
   *  nav_order[rel] slug array: listed slugs pinned first in declared order, rest auto-sorted.
   *  Auto-sort: newest-first if any entries have dates, alphabetical otherwise.
   *  index slug is always placed first. */
  const idx  = entries.filter(e => e.slug === 'index')
  const rest = entries.filter(e => e.slug !== 'index')
  const nav_map = Object.fromEntries(
    Object.entries(get_config().nav_order || {}).map(([k, v]) => [norm_path(k), v])
  )
  const nav  = nav_map[rel]

  if (Array.isArray(nav)) {
    const rank     = Object.fromEntries(nav.map((s, i) => [s, i]))
    const pinned   = rest.filter(e => rank[e.slug] != null).sort((a, b) => rank[a.slug] - rank[b.slug])
    const unpinned = rest.filter(e => rank[e.slug] == null)
    return [...idx, ...pinned, ...auto_sort(unpinned)]
  }

  return [...idx, ...auto_sort(rest)]
}


function write_meta(dest_path, entries) {
  /** Write a _meta.json from ordered [key, value] pairs, preserving order.
   *  Plain objects cannot be used — JS engines reorder numeric-like keys. */
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  fs.writeFileSync(dest_path, `{\n${lines.join(',\n')}\n}\n`)
}


function is_flatten(rel) {
  /** True if rel matches a directory in config.flatten (paths normalized). */
  return (get_config().flatten || []).map(norm_path).includes(rel)
}


function auto_index(dest_dir, sorted, rel) {
  /** Generate a redirect index.mdx to the first sorted leaf page.
   *  Uses AutoRedirect component so Next.js handles basePath automatically.
   *  No-ops if index.mdx already exists or no leaf pages are found. */
  if (fs.existsSync(path.join(dest_dir, 'index.mdx'))) return
  const first = sorted.find(e => fs.existsSync(path.join(dest_dir, `${e.slug}.mdx`)))
  if (!first) return
  const url      = rel ? `/${rel}/${first.slug}/` : `/${first.slug}/`
  const depth    = rel ? rel.split('/').length + 1 : 1
  const rel_path = '../'.repeat(depth) + 'components/AutoRedirect'
  fs.writeFileSync(path.join(dest_dir, 'index.mdx'), [
    `---`,
    `title: ${first.title}`,
    `auto_redirect: true`,
    `---`,
    ``,
    `import AutoRedirect from '${rel_path}'`,
    ``,
    `<AutoRedirect to="${url}" />`,
  ].join('\n') + '\n')
}


// --- Per-page transform ---

async function ingest_page(src_entry, dest, rel, slug, base, img_url) {
  /** Transform one source file into a frontmatter-free .mdx, register its metadata in
   *  _page_meta (frontmatter + derived + optional enrichment), and return a lean record. */
  const raw = fs.readFileSync(src_entry, 'utf8')
  const fm  = parse_fm(raw)
  const url_base = slug === 'index'
    ? (rel ? `/${rel}/` : '/')
    : (rel ? `/${rel}/${slug}/` : `/${slug}/`)

  let content = rewrite_md_links(rewrite_img_refs(strip_fm(raw), img_url), url_base)
  const title = fm.title || slug_to_title(base)
  if (slug !== 'index' && !first_h1(content)) content = `# ${title}\n\n${content}`
  fs.writeFileSync(dest, content)

  const parts = [...(rel ? rel.split('/') : []), ...(slug === 'index' ? [] : [slug])]
  const url   = '/' + parts.join('/')

  const record = {
    slug,
    title,
    date:         fm.date ? String(fm.date).slice(0, 10) : '',
    description:  fm.description || '',
    categories:   Array.isArray(fm.categories) ? fm.categories : [],
    tags:         Array.isArray(fm.tags)        ? fm.tags        : [],
    reading_time: reading_time(content),
    url:          url || '/',
  }

  // Full metadata: extra frontmatter keys + normalized record + optional enrichment
  const { title: _t, date: _d, description: _de, categories: _c, tags: _tg, ...extras } = fm
  const meta = { ...extras, ...record }

  const cfg = get_config().enrich
  if (cfg && cfg.url) {
    try {
      const text = extract_content(content)
      Object.assign(meta, await enrich.enrich_fields(cfg, meta, text))
      Object.assign(meta, await enrich.page_metrics(cfg, text) || {})
    } catch (err) {
      if (cfg.strict !== false) throw err
      console.warn(`  Warning: enrichment failed for ${record.url}: ${err.message}`)
    }
  }

  _page_meta[record.url] = meta
  return { ...record, description: meta.description, categories: meta.categories, tags: meta.tags }
}


// --- Directory walk and emission ---

async function ingest_dir(src_dir, dest_dir, rel) {
  /** Recursively mirror src_dir → dest_dir, then emit nav or feed output for the level.
   *  rel: path from SRC to src_dir using forward slashes ('' for root).
   *  Returns { title } from the directory's index page (or the directory name). */
  fs.mkdirSync(dest_dir, { recursive: true })
  const img_url = copy_images(src_dir, rel)

  const entries = []
  let dir_title = slug_to_title(path.basename(src_dir))

  for (const entry of fs.readdirSync(src_dir).sort()) {
    const src_entry = path.join(src_dir, entry)
    const stat = fs.statSync(src_entry)

    if (entry === 'images') continue  // handled by copy_images

    if (stat.isDirectory()) {
      const sub_rel = rel ? `${rel}/${entry}` : entry
      const { title } = await ingest_dir(src_entry, path.join(dest_dir, entry), sub_rel)
      entries.push({ slug: entry, title, date: '' })
      continue
    }

    const is_md  = entry.endsWith('.md')
    const is_mdx = entry.endsWith('.mdx')
    if (!is_md && !is_mdx) continue

    const base = path.basename(entry, is_mdx ? '.mdx' : '.md')
    const slug = (base === 'home' || base === 'index') ? 'index' : base
    const dest = path.join(dest_dir, `${slug}.mdx`)
    const record = await ingest_page(src_entry, dest, rel, slug, base, img_url)
    entries.push(record)
    if (slug === 'index') dir_title = record.title
  }

  const sorted = sort_entries(entries, rel)
  if (is_flatten(rel)) emit_feed(dest_dir, sorted, rel, dir_title)
  else emit_nav(dest_dir, sorted, rel)

  return { title: dir_title }
}


function copy_images(src_dir, rel) {
  /** Copy src_dir/images/ into public/images/<rel>/ and return the absolute image URL base. */
  const img_url  = '/images' + (rel ? `/${rel}` : '')
  const img_src  = path.join(src_dir, 'images')
  const img_dest = path.join(PUB_IMG, rel)  // rel='' → PUB_IMG itself

  if (fs.existsSync(img_src) && fs.statSync(img_src).isDirectory()) {
    fs.mkdirSync(img_dest, { recursive: true })
    for (const f of fs.readdirSync(img_src)) {
      const sf = path.join(img_src, f)
      if (fs.statSync(sf).isFile()) fs.copyFileSync(sf, path.join(img_dest, f))
    }
    strip_dir(img_dest)
  }
  return img_url
}


function emit_nav(dest_dir, sorted, rel) {
  /** Emit navigation output for a regular directory: auto index redirect + _meta.json. */
  if (!fs.existsSync(path.join(dest_dir, 'index.mdx'))) auto_index(dest_dir, sorted, rel)

  // If index.mdx exists but wasn't in sorted (auto-generated redirect), hide it from sidebar
  const has_index  = sorted.some(e => e.slug === 'index')
  const meta_pairs = sorted.map(e => [e.slug, e.title])
  if (!has_index && fs.existsSync(path.join(dest_dir, 'index.mdx'))) {
    meta_pairs.unshift(['index', { display: 'hidden', title: '' }])
  }
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
}


function emit_feed(dest_dir, sorted, rel, dir_title) {
  /** Emit feed output for a flattened directory: dir-feed JSON, DirFeed page, hidden meta. */
  const feed_entries = sorted
    .filter(e => e.slug !== 'index' && fs.existsSync(path.join(dest_dir, `${e.slug}.mdx`)))
    .map(e => ({ ...e, content: extract_content(fs.readFileSync(path.join(dest_dir, `${e.slug}.mdx`), 'utf8')) }))
  const name = rel.replace(/\//g, '-') || 'root'
  fs.mkdirSync(path.join(PUB_DIR, 'dir-feeds'), { recursive: true })
  fs.writeFileSync(path.join(PUB_DIR, 'dir-feeds', `${name}.json`), JSON.stringify(feed_entries, null, 2) + '\n')

  // depth from pages/ to the DirFeed page file
  const depth    = rel ? rel.split('/').length : 1
  const rel_path = '../'.repeat(depth) + 'components/DirFeed'
  const page = [`---`, `title: ${dir_title}`, `---`, ``, `import DirFeed from '${rel_path}'`, ``, `<DirFeed dir="${rel}" />`].join('\n') + '\n'

  if (rel) {
    // Non-root: write DirFeed as sibling .mdx file so Nextra treats it as a flat page (not a folder)
    fs.writeFileSync(path.join(dest_dir, '..', path.basename(dest_dir) + '.mdx'), page)
  } else {
    // Root: write index.mdx directly (no parent directory above pages/)
    fs.writeFileSync(path.join(dest_dir, 'index.mdx'), page)
  }

  // No index entry in meta — individual pages hidden, index.mdx not generated inside directory
  const meta_pairs = sorted.filter(e => e.slug !== 'index').map(e => [e.slug, { display: 'hidden', title: '' }])
  write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
}


// --- Consumer extension points ---

function sync_components(components_dir) {
  /** Mirror consumer-supplied React components into components/custom/ so content
   *  MDX can import them (e.g. `import X from '../components/custom/X'`). The
   *  directory is regenerated each build; an empty/unset config leaves it empty. */
  const dest = path.join(ROOT, 'components', 'custom')
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })

  if (!components_dir || !fs.existsSync(components_dir)) return []

  const copied = fs.readdirSync(components_dir).filter(f => /\.(jsx?|tsx?)$/.test(f))
  for (const file of copied) {
    fs.copyFileSync(path.join(components_dir, file), path.join(dest, file))
  }
  return copied
}


function sync_assets(assets_dir) {
  /** Mirror consumer-supplied static assets into public/assets/ so pages can
   *  fetch them at runtime (e.g. `${basePath}/assets/graph.json`). The
   *  directory is regenerated each build; an empty/unset config removes it. */
  const dest = path.join(PUB_DIR, 'assets')
  fs.rmSync(dest, { recursive: true, force: true })

  if (!assets_dir || !fs.existsSync(assets_dir)) return []

  fs.cpSync(assets_dir, dest, { recursive: true })
  return fs.readdirSync(dest)
}


// --- Pipeline entry ---

async function run(config) {
  /** Execute the full ingest pipeline with the given config object. */
  _config = config
  _page_meta = {}
  const src = config.content

  console.log(`\nIngesting from: ${src}`)

  if (config.enrich?.url) {
    try {
      await enrich.check_service(config.enrich.url)
      console.log(`  Enriching via taggly at ${config.enrich.url}`)
    } catch (err) {
      if (config.enrich.strict !== false) throw err
      console.warn(`  Warning: ${err.message} — skipping enrichment`)
      config.enrich = { ...config.enrich, url: '' }
    }
  }

  fs.rmSync(PAGES,   { recursive: true, force: true })
  fs.rmSync(PUB_IMG, { recursive: true, force: true })
  fs.rmSync(META,    { force: true })

  await ingest_dir(src, PAGES, '')

  fs.writeFileSync(META, JSON.stringify(_page_meta, null, 2) + '\n')
  console.log(`  Wrote metadata for ${Object.keys(_page_meta).length} page(s) to public/page-meta.json`)

  const app_src = path.join(ROOT, '_app.jsx')
  if (fs.existsSync(app_src)) fs.copyFileSync(app_src, path.join(PAGES, '_app.jsx'))

  const custom = sync_components(config.components)
  if (custom.length) console.log(`  Synced ${custom.length} custom component(s) into components/custom/`)

  const assets = sync_assets(config.assets)
  if (assets.length) console.log(`  Synced ${assets.length} asset(s) into public/assets/`)

  console.log(`  Mirrored source tree into pages/`)
  console.log('Done.\n')

  _config = null
}


// --- Exports ---

module.exports = { parse_fm, strip_fm, sort_entries, extract_content, auto_index, ensure_h1, first_h1, norm_path, slug_to_title, sync_assets, sync_components, run }


// --- Main (direct invocation: npm run ingest [source-dir]) ---
// Reads mdsite.yaml when present (site.config.js fallback), so enrich.on_build
// applies here too; one-off enriched builds use the CLI --enrich flag instead.

if (require.main === module) {
  const yaml_path = path.join(ROOT, 'mdsite.yaml')
  const cfg = fs.existsSync(yaml_path)
    ? require('./config').load_config(yaml_path)
    : { ...require('../site.config'), content: path.join(ROOT, 'docs') }
  if (process.argv[2]) cfg.content = path.resolve(process.argv[2])

  if (cfg.enrich?.url && !cfg.enrich.on_build) {
    console.log('Enrichment configured but skipped — set enrich.on_build or build with --enrich')
    cfg.enrich = { ...cfg.enrich, url: '' }
  }
  run(cfg).catch(err => { console.error(err.message); process.exit(1) })
}
