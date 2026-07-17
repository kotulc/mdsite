import { render, screen } from '@testing-library/react'
import SiteFooter from '../../components/SiteFooter'
import siteConfig from '../../site.config'

jest.mock('../../site.config', () => ({ title: 'testsite', footer: '' }))


afterEach(() => { siteConfig.footer = '' })

test('test_site_footer_default_credits', () => {
  /** Without a footer config value the default mdsite/Nextra credits render. */
  render(<SiteFooter />)
  expect(screen.getByText('mdsite')).toBeInTheDocument()
  expect(screen.getByText('Nextra')).toBeInTheDocument()
})

test('test_site_footer_custom_text', () => {
  /** A configured footer string replaces the default credits. */
  siteConfig.footer = 'Custom credits'
  render(<SiteFooter />)
  expect(screen.getByText('Custom credits')).toBeInTheDocument()
  expect(screen.queryByText('Nextra')).not.toBeInTheDocument()
})

test('test_site_footer_copyright_title', () => {
  /** The copyright line always includes the site title. */
  render(<SiteFooter />)
  expect(screen.getByText(new RegExp(`© \\d{4} testsite`))).toBeInTheDocument()
})
