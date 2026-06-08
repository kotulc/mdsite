/** Site-level configuration. Populate before running mdpub build or next dev. */
module.exports = {
  title: 'mdsite',
  base_url: 'https://kotulc.github.io',
  base_path: '/mdsite',
  repo_url: 'https://github.com/kotulc/mdsite',  // GitHub icon shown in header; leave empty to hide
  feed_url: 'updates',     // RSS icon shown in header linking to this path; leave empty to hide
  theme_toggle: 'navbar',  // where the light/dark/system toggle appears: 'navbar' or 'sidebar'
  ingest_readme: false,    // copy README.md → docs/about.md during ingest
  toc: true,               // right sidebar: "On This Page" section navigation
  meta_sidebar: true,      // right sidebar: tags, metrics, and related links below the TOC

  // Directories to render as inline feeds; '/' = site root
  flatten: ['updates'],

  // Nav ordering: key = directory path from source root ('' = root level)
  // Value: slug array to pin specific pages first; unlisted pages auto-sort
  // Auto-sort: newest-first when any page has a date field, alphabetical otherwise
  nav_order: {
    '': ['about', 'getting-started', 'configuration'],
    'features': ['overview'],
    'specs': ['format'],
    'updates': ['welcome'],
  },

  // Intelligence layer (Phase 2 — leave empty for defaults)
  content_style: '',  // e.g. 'technical', 'narrative', 'minimal'
  theme_mood: '',     // e.g. 'calm', 'bold', 'professional'
  logo_seed: 1,       // increment to regenerate logo
}
