const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''
const distDir = process.env.MDSITE_OUTPUT
  ? require('path').relative(__dirname, process.env.MDSITE_OUTPUT)
  : 'dist'

module.exports = withNextra({
  output: 'export',
  distDir,
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  env: { NEXT_PUBLIC_BUILD_TIME: new Date().toISOString() },
})
