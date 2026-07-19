import { useRouter } from 'next/router'
import PageHeader from './components/PageHeader'
import TagList from './components/TagList'
import SiteFooter from './components/SiteFooter'
import GitHubLink from './components/GitHubLink'
import FeedLink from './components/FeedLink'
import ThemeToggle from './components/ThemeToggle'
import siteConfig from './site.config'
import pageMeta from './public/page-meta.json'


function use_page_meta() {
  /** Metadata record for the current page from the generated page-meta.json. */
  const { route } = useRouter()
  return pageMeta[route] || {}
}


function PageMeta() {
  /** Renders date, reading time (unless disabled), and tag chips. */
  const meta = use_page_meta()
  const mins = siteConfig.reading_time === false ? null : meta.reading_time
  return (
    <>
      <PageHeader date={meta.date} reading_time={mins} />
      <TagList categories={meta.categories} tags={meta.tags} />
    </>
  )
}


function EditLink({ className }) {
  /** "Edit this page" TOC link to the configured repo; hidden when repo_url is unset. */
  if (!siteConfig.repo_url) return null
  return (
    <a href={siteConfig.repo_url} target="_blank" rel="noopener noreferrer" className={className}>
      Edit this page
    </a>
  )
}


function bg_rules(selector, value) {
  /** Background override CSS for a configured navbar/footer color ('' | 'primary' | CSS color). */
  if (!value) return ''
  if (value === 'primary') return (
    `${selector}{background:hsl(var(--site-hs) 94%)!important}` +
    `html.dark ${selector}{background:hsl(var(--site-hs) 45%/0.2)!important}`
  )
  return `${selector}{background:${value}!important}`
}


const THEME_CSS = [
  siteConfig.theme.font_stack && `body{font-family:${siteConfig.theme.font_stack}}`,
  bg_rules('.nextra-nav-container-blur', siteConfig.theme.navbar),
  bg_rules('footer.nx-bg-gray-100', siteConfig.theme.footer),
].filter(Boolean).join('')


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
    const meta = use_page_meta()
    return {
      titleTemplate: `%s – ${siteConfig.title}`,
      description: meta.description || siteConfig.description || undefined,
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {siteConfig.description && <meta name="description" content={siteConfig.description} />}
      {THEME_CSS && <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />}
    </>
  ),
  feedback: { content: null },
  editLink: { component: EditLink },
  toc: siteConfig.toc === false ? { component: () => null } : {},
  components: { h1: PageTitle },
  main: ({ children }) => <>{children}</>,
}
