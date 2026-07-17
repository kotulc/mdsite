/**
 * Right-hand sidebar displaying frontmatter metadata: categories, tags,
 * and any numeric fields as metrics with scores. Add numeric fields to
 * your page's frontmatter (e.g. readability: 72) to surface them here.
 */
import { useConfig } from 'nextra-theme-docs'
import Link from 'next/link'
import Chip from './Chip'


const RESERVED = new Set(['title', 'date', 'categories', 'tags', 'reading_time', 'related'])


export default function MetaSidebar() {
  const { frontMatter } = useConfig()
  const { categories = [], tags = [], related = [] } = frontMatter

  const metrics = Object.entries(frontMatter).filter(
    ([key, val]) => !RESERVED.has(key) && typeof val === 'number'
  )

  if (!categories.length && !tags.length && !metrics.length && !related.length) return null

  return (
    <div className="meta-sidebar-content">
      {(categories.length > 0 || tags.length > 0) && (
        <div className="meta-sidebar-section">
          <div className="meta-sidebar-label">Tags</div>
          <div className="meta-sidebar-chips">
            {categories.map(c => <Chip key={c} label={c} variant="category" />)}
            {tags.map(t => <Chip key={t} label={t} variant="tag" />)}
          </div>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="meta-sidebar-section">
          <div className="meta-sidebar-label">Metrics</div>
          {metrics.map(([key, val]) => (
            <div key={key} className="metric-row">
              <span className="metric-key">{key.replace(/_/g, ' ')}</span>
              <span className="metric-score">{val}</span>
            </div>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="meta-sidebar-section">
          <div className="meta-sidebar-label">Related</div>
          {related.map(({ title, url }) => (
            <div key={url} className="related-link">
              <Link href={url}>{title}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
