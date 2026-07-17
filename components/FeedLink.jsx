/**
 * RSS icon button in the navbar. Links to siteConfig.feed_url.
 * Hidden if feed_url is not set.
 */
import Link from 'next/link'
import siteConfig from '../site.config'


const RSS_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="6.18" cy="17.82" r="2.18" />
    <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
  </svg>
)


export default function FeedLink() {
  if (!siteConfig.feed_url) return null
  const href = `/${siteConfig.feed_url.replace(/^\/+|\/+$/g, '')}`
  return (
    <Link href={href} className="icon-link" aria-label="Feed">
      {RSS_ICON}
    </Link>
  )
}
