/**
 * Unit tests for the NLP enrichment step: field resolution, section splitting,
 * metric aggregation, and service failure. Uses the repo README body (frontmatter
 * stripped) as the canonical fixture; all taggly calls are mocked — no live service.
 */
const fs   = require('fs')
const path = require('path')

const { check_service, enrich_fields, page_metrics, mean_scores, split_sections } = require('../../scripts/enrich')

// README body with any frontmatter stripped — the canonical no-frontmatter fixture
const README = fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8')
  .replace(/^---[\s\S]*?---\r?\n/, '').trimStart()
const CFG = { url: 'http://test', fields: ['description', 'tags', 'categories'], metrics: [], strict: true }

// Canned taggly responses by route prefix
const RESPONSES = {
  '/desc':  { description: 'A static site generator.' },
  '/key':   { keywords: ['markdown', 'nextjs'] },
  '/tag':   { tags: { topics: ['static sites', 'docs', 'markdown', 'extra'] } },
  '/polar': { tags: [], scores: { negative: 0.1, neutral: 0.4, positive: 0.5 } },
  '/spam':  { tags: [], score: 0.04 },
  '/tox':   { tags: [], score: 0.002 },
}

beforeEach(() => {
  global.fetch = jest.fn(url => {
    const route = '/' + url.split('/').pop().split('?')[0]
    return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSES[route]) })
  })
})
afterEach(() => { delete global.fetch })


describe('enrich_fields', () => {
  test('test_enrich_fields_fills_missing_only', async () => {
    /** An empty record gets all configured fields from their mapped routes. */
    const added = await enrich_fields(CFG, {}, README)
    expect(added).toEqual({
      description: 'A static site generator.',
      tags: ['markdown', 'nextjs'],
      categories: ['static sites', 'docs', 'markdown'],
    })
  })

  test('test_enrich_fields_respects_record', async () => {
    /** Fields already present in the record are never fetched or overwritten. */
    const record = { description: 'Hand-written.', tags: ['manual'] }
    const added = await enrich_fields(CFG, record, README)
    expect(added).toEqual({ categories: ['static sites', 'docs', 'markdown'] })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})


describe('page_metrics', () => {
  test('test_page_metrics_sections_and_mean', async () => {
    /** Metrics are scored per ## section and aggregated to a document-level mean. */
    const cfg = { ...CFG, metrics: ['polarity', 'spam', 'toxicity'] }
    const result = await page_metrics(cfg, '# T\n\nIntro.\n\n## One\n\nA.\n\n## Two\n\nB.\n')
    expect(result.sections.map(s => s.heading)).toEqual(['One', 'Two'])
    expect(result.metrics.polarity).toEqual({ negative: 0.1, neutral: 0.4, positive: 0.5 })
    expect(result.metrics.spam).toBe(0.04)
    expect(result.metrics.toxicity).toBe(0.002)
  })

  test('test_page_metrics_whole_doc_when_no_sections', async () => {
    /** A page without ## headings is scored as a single unnamed section. */
    const cfg = { ...CFG, metrics: ['spam'] }
    const result = await page_metrics(cfg, 'Just a short page with no headings.')
    expect(result.sections).toEqual([{ heading: '', spam: 0.04 }])
    expect(result.metrics.spam).toBe(0.04)
  })

  test('test_page_metrics_null_when_unconfigured', async () => {
    /** No metrics configured -> null result and no network calls. */
    expect(await page_metrics(CFG, README)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})


describe('mean_scores', () => {
  test('test_mean_scores_numbers', () => {
    /** Numeric scores aggregate to their rounded mean. */
    expect(mean_scores([0.1, 0.2, 0.6])).toBe(0.3)
  })

  test('test_mean_scores_objects', () => {
    /** Flat score objects aggregate element-wise (e.g. polarity). */
    const result = mean_scores([{ positive: 0.2, negative: 0.8 }, { positive: 0.4, negative: 0.6 }])
    expect(result).toEqual({ positive: 0.3, negative: 0.7 })
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

  test('test_split_sections_readme_fixture', () => {
    /** The README fixture splits into its actual ## sections. */
    const sections = split_sections(README)
    expect(sections.length).toBeGreaterThan(1)
    for (const s of sections) expect(s.heading).toBeTruthy()
  })
})


describe('check_service', () => {
  test('test_check_service_unreachable_throws', async () => {
    /** An unreachable service produces a clear actionable error. */
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')))
    await expect(check_service('http://down')).rejects.toThrow(/unreachable.*taggly/)
  })
})
