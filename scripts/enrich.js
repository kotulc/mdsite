/**
 * Optional NLP enrichment via a local taggly service (github.com/kotulc/taggly).
 * Generates missing metadata fields (description, tags, categories) and computes
 * per-section metrics (polarity, spam, toxicity), aggregated to the document level.
 * Results land in public/page-meta.json — never in frontmatter.
 * Enabled by setting enrich.url in mdsite.yaml; disabled (no-op) when unset.
 */


// Metadata field -> taggly route + response mapping
const FIELDS = {
  description: { route: '/desc',        pick: r => r.description },
  tags:        { route: '/key?top_n=8', pick: r => r.keywords },
  categories:  { route: '/tag',         pick: r => (r.tags.topics || []).slice(0, 3) },
}

// Metric name -> taggly route + response mapping
const METRICS = {
  polarity: { route: '/polar', pick: r => r.scores },
  spam:     { route: '/spam',  pick: r => r.score },
  toxicity: { route: '/tox',   pick: r => r.score },
}

// Classifier models reject long inputs (~512 tokens) — score plain prose, truncated
const METRIC_MAX = 1500

function plain_text(text) {
  /** Reduce markdown to plain prose: drop code fences and markdown syntax characters. */
  return text.replace(/```[\s\S]*?```/g, ' ')
             .replace(/[#*`[\]()!|>-]/g, ' ')
             .replace(/\s+/g, ' ').trim()
}


async function call(url, route, content) {
  /** POST content to a taggly route and return the parsed JSON response. */
  const res = await fetch(url + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`taggly ${route} responded HTTP ${res.status}`)
  return res.json()
}


async function check_service(url) {
  /** Throw a clear error if the configured taggly instance is unreachable. */
  try {
    const res = await fetch(url + '/status')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    throw new Error(
      `enrich.url '${url}' is unreachable (${err.message}) — start taggly or unset enrich.url`
    )
  }
}


async function enrich_fields(cfg, record, content) {
  /** Return values for configured fields missing from the page record. */
  const added = {}
  for (const field of cfg.fields) {
    const has = Array.isArray(record[field]) ? record[field].length : record[field]
    if (has) continue
    const { route, pick } = FIELDS[field]
    added[field] = pick(await call(cfg.url, route, content))
  }
  return added
}


async function page_metrics(cfg, content) {
  /** Score each ## section (whole document when no sections), then aggregate to the
   *  document level by mean. Returns { metrics, sections } or null when unconfigured. */
  if (!cfg.metrics.length) return null
  const chunks = split_sections(content)
  if (!chunks.length) chunks.push({ heading: '', text: content })

  const sections = []
  for (const { heading, text } of chunks) {
    sections.push({ heading, ...(await score_text(cfg, text)) })
  }
  const metrics = Object.fromEntries(
    cfg.metrics.map(m => [m, mean_scores(sections.map(s => s[m]))])
  )
  return { metrics, sections }
}


async function score_text(cfg, text) {
  /** Compute each configured metric for a block of text (as truncated plain prose). */
  const prose = plain_text(text).slice(0, METRIC_MAX)
  const scores = {}
  for (const metric of cfg.metrics) {
    const { route, pick } = METRICS[metric]
    scores[metric] = pick(await call(cfg.url, route, prose))
  }
  return scores
}


function mean_scores(values) {
  /** Element-wise mean of an array of numbers or of flat { key: number } objects. */
  const mean = nums => Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 1e4) / 1e4
  if (typeof values[0] === 'number') return mean(values)
  return Object.fromEntries(Object.keys(values[0]).map(k => [k, mean(values.map(v => v[k]))]))
}


function split_sections(content) {
  /** Split markdown into { heading, text } chunks on ## headings (code fences respected).
   *  Content before the first ## heading is not returned as a section. */
  const sections = []
  let current = null
  let in_fence = false

  for (const line of content.split('\n')) {
    if (/^```/.test(line)) in_fence = !in_fence
    const match = !in_fence && line.match(/^##\s+(.+)/)
    if (match) {
      if (current) sections.push(current)
      current = { heading: match[1].trim(), text: '' }
    } else if (current) {
      current.text += line + '\n'
    }
  }
  if (current) sections.push(current)
  return sections.map(s => ({ ...s, text: s.text.trim() }))
}


module.exports = { FIELDS, METRICS, check_service, enrich_fields, page_metrics, mean_scores, split_sections }
