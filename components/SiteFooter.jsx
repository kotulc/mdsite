/**
 * Site footer: copyright, build timestamp, and credits.
 * Edit this file to customize the footer that appears on every page.
 */
import siteConfig from '../site.config'


export default function SiteFooter() {
  const build_time = process.env.NEXT_PUBLIC_BUILD_TIME
  const formatted = build_time
    ? new Date(build_time).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null
  return (
    <div className="site-footer">
      <span>© {new Date().getFullYear()} {siteConfig.title}</span>
      {formatted && <><span className="site-footer-sep">·</span><span>Updated {formatted}</span></>}
      <span className="site-footer-sep">·</span>
      <span>
        Powered by{' '}
        <a href="https://github.com/kotulc/mdsite" target="_blank" rel="noopener noreferrer">mdsite</a>
        {' '}and{' '}
        <a href="https://nextra.site" target="_blank" rel="noopener noreferrer">Nextra</a>
      </span>
    </div>
  )
}
