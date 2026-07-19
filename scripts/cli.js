/**
 * mdsite CLI — entry point for the Docker container.
 * Usage: node scripts/cli.js build --config <path> [--content <path>] [--output <path>] [--enrich]
 */
const path               = require('path')
const { spawnSync }      = require('child_process')
const { load_config, write_site_config } = require('./config')
const ingest             = require('./ingest')


const ROOT = path.join(__dirname, '..')


function parse_args(argv) {
  /** Parse command and named flags from process.argv (flags without a value are true). */
  const args    = argv.slice(2)
  const command = args[0]
  const flags   = {}
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue
    if (args[i + 1] && !args[i + 1].startsWith('--')) flags[args[i].slice(2)] = args[++i]
    else flags[args[i].slice(2)] = true
  }
  return { command, flags }
}


async function cmd_build(flags) {
  /** Load config, ingest content, build static site to output path. */
  if (!flags.config) {
    console.error('Error: --config <path> is required')
    process.exit(1)
  }

  const config = load_config(flags.config)
  if (flags.content) config.content = path.resolve(flags.content)
  if (flags.output)  config.output  = path.resolve(flags.output)

  // Enrichment runs only when requested: --enrich flag or enrich.on_build in the YAML
  if (flags.enrich && !config.enrich.url) {
    console.error('Error: --enrich requires enrich.url in the config')
    process.exit(1)
  }
  if (!flags.enrich && !config.enrich.on_build) {
    if (config.enrich.url) console.log('Enrichment configured but skipped — pass --enrich or set enrich.on_build')
    config.enrich = { ...config.enrich, url: '' }
  }

  process.env.MDSITE_OUTPUT = config.output
  write_site_config(config)

  console.log(`\nmdsite build`)
  console.log(`  config:  ${flags.config}`)
  console.log(`  content: ${config.content}`)
  console.log(`  output:  ${config.output}\n`)

  await ingest.run(config)

  const result = spawnSync('npm', ['run', 'build'], {
    cwd:   ROOT,
    stdio: 'inherit',
    shell: true,
    env:   { ...process.env },
  })

  process.exit(result.status ?? 1)
}


// --- Main ---

const { command, flags } = parse_args(process.argv)

if (command === 'build') {
  cmd_build(flags).catch(err => { console.error(err.message); process.exit(1) })
} else {
  console.error(`Unknown command: ${command || '(none)'}`)
  console.error('Usage: mdsite build --config <path>')
  process.exit(1)
}
