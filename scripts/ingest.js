/**
 * Content ingestion pipeline.
 * Recursively mirrors any markdown source tree into the Next.js site content directory (pages/):
 *   - Renames .md → .mdx (home.md or index.md at any level → index.mdx)
 *   - Auto-generates index.mdx (redirect to first sorted page) when none exists
 *   - Copies images/ subdirectories to public/images/<rel-path>/
 *   - Rewrites relative image refs to absolute /images/<rel-path>/... URLs
 *   - Strips corrupt EXIF segments from copied JPEGs
 *   - Injects reading_time into each page's frontmatter
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
const { strip_dir } = require('./fix-exif')


const ROOT    = path.join(__dirname, '..')
const PAGES   = path.join(ROOT, 'pages')
const PUB_IMG = path.join(ROOT, 'public', 'images')
const PUB_DIR = path.join(ROOT, 'public')


// Module-level config: set by run(config), falls back to site.config.js for local dev
let _config = null
function get_config() { return _config || require('../site.config') }


function parse_fm(content) {
  /** Extract scalars and arrays from YAML frontmatter. */
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm = {}
  const lines = match[1].split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const colon = lines[i].indexOf(':')
    if (colon < 0) { i++; continue }
    const key = lines[i].slice(0, colon).trim()
    const val = lines[i].slice(colon + 1).trim().replace(/^["'](.*)["']$/, '$1')
    i++

    if (!val) {  // Possible YAML list — collect "- item" lines
      const items = []
      while (i < lines.length && /^\s*-/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s*/, '').replace(/^["'](.*)["']$/, '$1'))
        i++
      }
      fm[key] = items
    } else {
      fm[key] = val
    }
  }
  return fm
}


function reading_time(content) {
  /** Estimate reading time in minutes from MDX content. */
  const body = content.replace(/^---[\s\S]*?---\n/, '')
  const text = body.replace(/```[\s\S]*?```/g, '')
                   .replace(/[#*`[\]()!|>]/g, ' ')
                   .replace(/\s+/g, ' ').trim()
  const words = text.split(' ').filter(w => w.length > 1).length
  return Math.max(1, Math.round(words / 200))
}


function add_reading_time(mdx_path) {
  /** Inject reading_time into frontmatter. Returns estimated minutes. */
  const content = fs.readFileSync(mdx_path, 'utf8')
  const mins = reading_time(content)
  const updated = content.replace(/^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/, `$1\nreading_time: ${mins}$2`)
  fs.writeFileSync(mdx_path, updated)
  return mins
}


function rewrite_img_refs(mdx_path, img_url) {
  /** Replace ](images/ with ](<img_url>/ in an MDX file. */
  const original = fs.readFileSync(mdx_path, 'utf8')
  const updated = original.replace(/\]\(images\//g, `](${img_url}/`)
  if (updated !== original) fs.writeFileSync(mdx_path, updated)
}


function rewrite_md_links(mdx_path, url_base) {
  /** Rewrite relative markdown links to absolute paths using the page URL base.
   *  Skips image links (![...]), already-absolute hrefs, and fragment-only refs. */
  const original = fs.readFileSync(mdx_path, 'utf8')
  const updated = original.replace(
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
  if (updated !== original) fs.writeFileSync(mdx_path, updated)
}


function write_meta(dest_path, entries) {
  /** Write a _meta.json from ordered [key, value] pairs, preserving order.
   *  Plain objects cannot be used — JS engines reorder numeric-like keys. */
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  fs.writeFileSync(dest_path, `{\n${lines.join(',\n')}\n}\n`)
}


function norm_path(p) {
  /** Strip leading and trailing slashes; '/' and '' both become ''. */
  return (p || '').replace(/^\/+|\/+$/g, '')
}


function is_flatten(rel) {
  /** True if rel matches a directory in config.flatten (paths normalized). */
  return (get_config().flatten || []).map(norm_path).includes(rel)
}


function write_dir_feed(entries, rel) {
  /** Write public/dir-feeds/<name>.json for a flattened directory. */
  const name = rel.replace(/\//g, '-') || 'root'
  const dir  = path.join(PUB_DIR, 'dir-feeds')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(entries, null, 2) + '\n')
}


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


function ingest_dir(src_dir, dest_dir, rel) {
  /** Recursively mirror src_dir → dest_dir.
   *  rel: path from SRC to src_dir using forward slashes ('' for root).
   *  Returns { title } from the directory's index page (or the directory name). */
  fs.mkdirSync(dest_dir, { recursive: true })

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

  const entries = []
  const base = path.basename(src_dir)
  let dir_title = slug_to_title(base)

  for (const entry of fs.readdirSync(src_dir).sort()) {
    const src_entry = path.join(src_dir, entry)
    const stat = fs.statSync(src_entry)

    if (entry === 'images') continue  // handled above

    if (stat.isDirectory()) {
      const sub_rel = rel ? `${rel}/${entry}` : entry
      const { title } = ingest_dir(src_entry, path.join(dest_dir, entry), sub_rel)
      entries.push({ slug: entry, title, date: '' })
      continue
    }

    const is_md  = entry.endsWith('.md')
    const is_mdx = entry.endsWith('.mdx')
    if (!is_md && !is_mdx) continue

    const base = path.basename(entry, is_mdx ? '.mdx' : '.md')
    const slug = (base === 'home' || base === 'index') ? 'index' : base
    const dest = path.join(dest_dir, `${slug}.mdx`)
    const url_base = slug === 'index'
      ? (rel ? `/${rel}/` : '/')
      : (rel ? `/${rel}/${slug}/` : `/${slug}/`)
    fs.copyFileSync(src_entry, dest)
    rewrite_img_refs(dest, img_url)
    rewrite_md_links(dest, url_base)
    const mins = add_reading_time(dest)
    const fm   = parse_fm(fs.readFileSync(dest, 'utf8'))
    if (slug !== 'index') ensure_h1(dest, fm.title || slug)

    const parts = [...(rel ? rel.split('/') : []), ...(slug === 'index' ? [] : [slug])]
    const url   = '/' + parts.join('/')

    const record = {
      slug,
      title:        fm.title        || slug_to_title(base),
      date:         fm.date         || '',
      categories:   Array.isArray(fm.categories) ? fm.categories : [],
      tags:         Array.isArray(fm.tags)        ? fm.tags        : [],
      reading_time: mins,
      url:          url || '/',
    }
    entries.push(record)
    if (slug === 'index') dir_title = record.title
  }

  const sorted  = sort_entries(entries, rel)
  const is_flat = is_flatten(rel)

  if (is_flat) {
    // Re-read content for flat entries (content not stored in record by default)
    const feed_entries = sorted
      .filter(e => e.slug !== 'index' && fs.existsSync(path.join(dest_dir, `${e.slug}.mdx`)))
      .map(e => ({ ...e, content: extract_content(fs.readFileSync(path.join(dest_dir, `${e.slug}.mdx`), 'utf8')) }))
    write_dir_feed(feed_entries, rel)

    // depth from pages/ to the DirFeed page file
    const depth    = rel ? rel.split('/').length : 1
    const rel_path = '../'.repeat(depth) + 'components/DirFeed'

    if (rel) {
      // Non-root: write DirFeed as sibling .mdx file so Nextra treats it as a flat page (not a folder)
      const page_path = path.join(dest_dir, '..', path.basename(dest_dir) + '.mdx')
      fs.writeFileSync(page_path, [
        `---`, `title: ${dir_title}`, `---`, ``,
        `import DirFeed from '${rel_path}'`, ``,
        `<DirFeed dir="${rel}" />`,
      ].join('\n') + '\n')
    } else {
      // Root: write index.mdx directly (no parent directory above pages/)
      fs.writeFileSync(path.join(dest_dir, 'index.mdx'), [
        `---`, `title: ${dir_title}`, `---`, ``,
        `import DirFeed from '${rel_path}'`, ``,
        `<DirFeed dir="" />`,
      ].join('\n') + '\n')
    }

    // No index entry in meta — individual pages hidden, index.mdx not generated inside directory
    const meta_pairs = sorted.filter(e => e.slug !== 'index').map(e => [e.slug, { display: 'hidden', title: '' }])
    write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
  } else {
    if (!fs.existsSync(path.join(dest_dir, 'index.mdx'))) auto_index(dest_dir, sorted, rel)

    // If index.mdx exists but wasn't in sorted (auto-generated redirect), hide it from sidebar
    const has_index  = sorted.some(e => e.slug === 'index')
    const meta_pairs = sorted.map(e => [e.slug, e.title])
    if (!has_index && fs.existsSync(path.join(dest_dir, 'index.mdx'))) {
      meta_pairs.unshift(['index', { display: 'hidden', title: '' }])
    }
    write_meta(path.join(dest_dir, '_meta.json'), meta_pairs)
  }

  return { title: dir_title }
}


function ensure_h1(mdx_path, title) {
  /** Prepend # title heading if body has no h1. */
  const content = fs.readFileSync(mdx_path, 'utf8')
  const body    = content.replace(/^---[\s\S]*?---\r?\n/, '')
  if (/^#\s/.test(body.trimStart())) return
  const updated = content.replace(/(^---[\s\S]*?---\r?\n)/, `$1\n# ${title}\n\n`)
  fs.writeFileSync(mdx_path, updated)
}


function extract_content(mdx) {
  /** Strip frontmatter, imports, bare JSX tags, and leading H1 from MDX.
   *  Processes line-by-line to skip content inside code fences. */
  const body = mdx.replace(/^---[\s\S]*?---\r?\n/, '')
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


function run(config) {
  /** Execute the full ingest pipeline with the given config object. */
  _config = config
  const src = config.content

  console.log(`\nIngesting from: ${src}`)

  fs.rmSync(PAGES,   { recursive: true, force: true })
  fs.rmSync(PUB_IMG, { recursive: true, force: true })

  ingest_dir(src, PAGES, '')

  const app_src = path.join(ROOT, '_app.jsx')
  if (fs.existsSync(app_src)) fs.copyFileSync(app_src, path.join(PAGES, '_app.jsx'))

  const custom = sync_components(config.components)
  if (custom.length) console.log(`  Synced ${custom.length} custom component(s) into components/custom/`)

  console.log(`  Mirrored source tree into pages/`)
  console.log('Done.\n')

  _config = null
}


// --- Exports ---

module.exports = { parse_fm, sort_entries, extract_content, auto_index, norm_path, slug_to_title, sync_components, run }


// --- Main (direct invocation: npm run ingest [source-dir]) ---

if (require.main === module) {
  const src = path.resolve(process.argv[2] || path.join(ROOT, 'docs'))
  const cfg = { ...require('../site.config'), content: src }
  run(cfg)
}
