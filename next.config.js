const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

const siteConfig = require('./site.config')
const basePath = process.env.NODE_ENV === 'production'
  ? (process.env.BASE_PATH || siteConfig.base_path || '')
  : ''

module.exports = withNextra({
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  env: { NEXT_PUBLIC_BUILD_TIME: new Date().toISOString() },
})
