/**
 * Renders a flattened directory as an inline scrolling feed.
 * Fetches public/dir-feeds/<name>.json and renders each entry as a feed section.
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import PageHeader from './PageHeader'
import TagList from './TagList'
import siteConfig from '../site.config'


const md_components = (basePath) => ({
  img: ({ src, alt }) => <img src={`${basePath}${src}`} alt={alt} />,
})


export default function DirFeed({ dir }) {
  const { basePath } = useRouter()
  const [entries, set_entries] = useState(null)

  useEffect(() => {
    const name = (dir || '').replace(/\//g, '-') || 'root'
    fetch(`${basePath}/dir-feeds/${name}.json`)
      .then(r => r.json())
      .then(set_entries)
      .catch(() => set_entries([]))
  }, [dir, basePath])

  if (!entries) return <p className="feed-loading">Loading…</p>
  if (!entries.length) return null

  return (
    <div className="dir-feed">
      {entries.map((e, i) => (
        <section key={e.url} className="feed-section">
          {i > 0 && <div className="feed-section-divider" />}
          <h2 className="feed-section-title">
            <Link href={e.url}>{e.title}</Link>
          </h2>
          <PageHeader date={e.date}
                      reading_time={siteConfig.reading_time === false ? null : e.reading_time} />
          <TagList categories={e.categories} tags={e.tags} />
          <div className="feed-section-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={md_components(basePath)}>{e.content}</ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  )
}
