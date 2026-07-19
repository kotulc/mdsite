/**
 * Unit tests for the NLP enrichment step: field resolution, section splitting,
 * frontmatter injection, and service failure. Uses the repo README (no frontmatter)
 * as the canonical fixture; all taggly calls are mocked — no live service required.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { check_service, enrich_fields, page_metrics, split_sections, inject_fm } = require('../../scripts/enrich')
const { ensure_fm, parse_fm } = require('../../scripts/ingest')

// README body with any frontmatter stripped — the canonical no-frontmatter fixture
const README = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8')
  .replace(/^---[\s\S]*?---\r?\n/, '').trimStart()
const CFG    = { url: 'http://test', fields: ['description', 'tags', 'categories'], metrics: [], strict: true }

// Canned taggly responses by route prefix
const RESPONSES = {
  '/desc':  { description: 'A static site generator.' },
  '/key':   { keywords: ['markdown', 'nextjs'] },
  '/tag':   { tags: { topics: ['static sites', 'docs', 'markdown', 'extra'] } },
  '/polar': { tags: [], scores: { negative: 0.1, neutral: 0.4, positive: 0.5 } },
  '/spam':  { tags: [], score: 0.04 },
  '/tox':   { tags: [], score: 0.001 },
}

beforeEach(() => {
  global.fetch = jest.fn(url => {
    const route = '/' + url.split('/').pop().split('?')[0]
    return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSES[route]) })
  })
})
afterEach(() => { delete global.fetch })

let tmp
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdsite-enrich-')) })
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }) })


describe('enrich_fields', () => {
  test('test_enrich_fields_fills_missing_only', async () => {
    /** Empty frontmatter gets all configured fields from their mapped routes. */
    const added = await enrich_fields(CFG, {}, README)
    expect(added).toEqual({
      description: 'A static site generator.',
      tags: ['markdown', 'nextjs'],
      categories: ['static sites', 'docs', 'markdown'],
    })
  })

  test('test_enrich_fields_respects_frontmatter', async () => {
    /** Fields present in frontmatter are never fetched or overwritten. */
    const fm = { description: 'Hand-written.', tags: ['manual'] }
    const added = await enrich_fields(CFG, fm, README)
    expect(added).toEqual({ categories: ['static sites', 'docs', 'markdown'] })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})


describe('page_metrics', () => {
  test('test_page_metrics_document_and_sections', async () => {
    /** Configured metrics are scored for the document and each ## section. */
    const cfg = { ...CFG, metrics: ['polarity', 'spam', 'toxicity'] }
    const result = await page_metrics(cfg, '# T\n\nIntro.\n\n## One\n\nA.\n\n## Two\n\nB.\n')
    expect(result.polarity).toEqual({ negative: 0.1, neutral: 0.4, positive: 0.5 })
    expect(result.spam).toBe(0.04)
    expect(result.toxicity).toBe(0.001)
    expect(result.sections.map(s => s.heading)).toEqual(['One', 'Two'])
    expect(result.sections[0].spam).toBe(0.04)
  })

  test('test_page_metrics_null_when_unconfigured', async () => {
    /** No metrics configured -> null result and no network calls. */
    expect(await page_metrics(CFG, README)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})


describe('split_sections', () => {
  test('test_split_sections_headings', () => {
    /** Splits on ## headings; content before the first heading is excluded. */
    const sections = split_sections('Intro.\n\n## Alpha\n\nA.\n\n## Beta\n\nB.\n')
    expect(sections).toEqual([
      { heading: 'Alpha', text: 'A.' },
      { heading: 'Beta', text: 'B.' },
    ])
  })

  test('test_split_sections_ignores_fenced_headings', () => {
    /** ## lines inside code fences are not treated as section boundaries. */
    const sections = split_sections('## Real\n\n```\n## fake\n```\ntail\n')
    expect(sections.map(s => s.heading)).toEqual(['Real'])
  })
})


describe('frontmatter creation and injection', () => {
  test('test_ensure_fm_creates_block_from_h1', () => {
    /** A file with no frontmatter (like README.md) gets a block titled from its first h1. */
    const p = path.join(tmp, 'about.mdx')
    fs.writeFileSync(p, README)
    ensure_fm(p, 'readme')
    expect(parse_fm(fs.readFileSync(p, 'utf8')).title).toBe('mdsite')
  })

  test('test_inject_fm_round_trips_through_parse', () => {
    /** Injected scalar and list fields parse back with identical values. */
    const p = path.join(tmp, 'page.mdx')
    fs.writeFileSync(p, '---\ntitle: T\n---\n\nBody.\n')
    inject_fm(p, { description: 'A "quoted" summary.', tags: ['a', 'b'] })
    const fm = parse_fm(fs.readFileSync(p, 'utf8'))
    expect(fm.tags).toEqual(['a', 'b'])
    expect(fm.description).toContain('quoted')
  })
})


describe('check_service', () => {
  test('test_check_service_unreachable_throws', async () => {
    /** An unreachable service produces a clear actionable error. */
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')))
    await expect(check_service('http://down')).rejects.toThrow(/unreachable.*taggly/)
  })
})
