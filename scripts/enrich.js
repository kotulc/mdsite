/**
 * Optional NLP enrichment via a local taggly service (github.com/kotulc/taggly).
 * Fills missing frontmatter fields (description, tags, categories) on generated pages
 * and computes page/section metrics (polarity, spam, toxicity) for public/page-meta.json.
 * Enabled by setting enrich.url in mdsite.yaml; disabled (no-op) when unset.
 */
const fs = require('fs')


// Frontmatter field -> taggly route + response mapping
const FIELDS = {
  description: { route: '/desc',       pick: r => r.description },
  tags:        { route: '/key?top_n=8', pick: r => r.keywords },
  categories:  { route: '/tag',        pick: r => (r.tags.topics || []).slice(0, 3) },
}

// Metric name -> taggly route + response mapping
const METRICS = {
  polarity: { route: '/polar', pick: r => r.scores },
  spam:     { route: '/spam',  pick: r => r.score },
  toxicity: { route: '/tox',   pick: r => r.score },
}

// Classifier models reject long inputs (HTTP 500 above ~1600 chars) — truncate metric text
const METRIC_MAX = 1500


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


async function enrich_fields(cfg, fm, content) {
  /** Return values for configured fields missing from frontmatter fm. */
  const added = {}
  for (const field of cfg.fields) {
    const has = Array.isArray(fm[field]) ? fm[field].length : fm[field]
    if (has) continue
    const { route, pick } = FIELDS[field]
    added[field] = pick(await call(cfg.url, route, content))
  }
  return added
}


async function page_metrics(cfg, content) {
  /** Compute configured metrics for a page and each of its ## sections.
   *  Returns { <metric>..., sections: [{ heading, <metric>... }] } or null when unconfigured. */
  if (!cfg.metrics.length) return null
  const record = await score_text(cfg, content)
  record.sections = []
  for (const { heading, text } of split_sections(content)) {
    record.sections.push({ heading, ...(await score_text(cfg, text)) })
  }
  return record
}


async function score_text(cfg, text) {
  /** Compute each configured metric for a block of text (truncated to METRIC_MAX). */
  const scores = {}
  for (const metric of cfg.metrics) {
    const { route, pick } = METRICS[metric]
    scores[metric] = pick(await call(cfg.url, route, text.slice(0, METRIC_MAX)))
  }
  return scores
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


function inject_fm(mdx_path, fields) {
  /** Insert serialized fields before the closing --- of an existing frontmatter block. */
  if (!Object.keys(fields).length) return
  const lines = Object.entries(fields).map(([key, val]) =>
    Array.isArray(val)
      ? `${key}:\n${val.map(v => `  - ${JSON.stringify(v)}`).join('\n')}`
      : `${key}: ${JSON.stringify(val)}`
  )
  const content = fs.readFileSync(mdx_path, 'utf8')
  const updated = content.replace(/^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/, `$1\n${lines.join('\n')}$2`)
  fs.writeFileSync(mdx_path, updated)
}


module.exports = { FIELDS, METRICS, check_service, enrich_fields, page_metrics, split_sections, inject_fm }
