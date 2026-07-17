import { useConfig } from 'nextra-theme-docs'
import PageHeader from './components/PageHeader'
import TagList from './components/TagList'
import MetaSidebar from './components/MetaSidebar'
import SiteFooter from './components/SiteFooter'
import GitHubLink from './components/GitHubLink'
import FeedLink from './components/FeedLink'
import ThemeToggle from './components/ThemeToggle'
import siteConfig from './site.config'


function PageMeta() {
  /** Renders date, reading time (unless disabled), and tag chips. */
  const { frontMatter } = useConfig()
  const mins = siteConfig.reading_time === false ? null : frontMatter.reading_time
  return (
    <>
      <PageHeader date={frontMatter.date} reading_time={mins} />
      <TagList categories={frontMatter.categories} tags={frontMatter.tags} />
    </>
  )
}


function PageTitle({ children }) {
  /** Custom h1 override: renders the heading then immediately injects page metadata. */
  return (
    <>
      <h1 className="nx-mt-2 nx-text-4xl nx-font-bold nx-tracking-tight nx-text-slate-900 dark:nx-text-slate-100">{children}</h1>
      <PageMeta />
    </>
  )
}


export default {
  logo: <span style={{ fontWeight: 600 }}>{siteConfig.title}</span>,
  primaryHue: siteConfig.theme.hue,
  primarySaturation: siteConfig.theme.saturation,
  darkMode: siteConfig.theme_toggle !== 'navbar',
  navbar: {
    extraContent: (
      <div className="navbar-icons">
        {siteConfig.theme_toggle === 'navbar' && <ThemeToggle />}
        <FeedLink />
        <GitHubLink />
      </div>
    ),
  },
  footer: { text: <SiteFooter /> },
  useNextSeoProps() {
    return { titleTemplate: `%s – ${siteConfig.title}` }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {siteConfig.description && <meta name="description" content={siteConfig.description} />}
      {siteConfig.theme.font_stack && (
        <style dangerouslySetInnerHTML={{ __html: `body{font-family:${siteConfig.theme.font_stack}}` }} />
      )}
    </>
  ),
  toc: siteConfig.toc === false
    ? { component: () => null }
    : { extraContent: siteConfig.meta_sidebar !== false ? MetaSidebar : undefined },
  components: { h1: PageTitle },
  main: ({ children }) => <>{children}</>,
}
