/**
 * Single-command setup: validates environment, runs ingestion, optionally builds.
 * Usage: node scripts/setup.js [--source <dir>] [--build]
 */
const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')


const ROOT = path.join(__dirname, '..')


function parse_args() {
  /** Extract --source <dir> and --build flag from process.argv. */
  const args = process.argv.slice(2)
  let source = null
  let build  = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) { source = args[++i] }
    else if (args[i] === '--build') { build = true }
  }
  return { source, build }
}


function check_node() {
  /** Warn if Node.js major version is below 18. */
  const major = parseInt(process.versions.node.split('.')[0], 10)
  if (major < 18) console.warn(`  Warning: Node.js ${process.versions.node} detected; 18+ recommended.`)
}


function check_npm_installed() {
  /** Abort if node_modules is absent (npm install not yet run). */
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    console.error('  Error: node_modules not found — run `npm install` first.')
    process.exit(1)
  }
}



function run_ingest(source) {
  /** Run scripts/ingest.js with the resolved source directory. */
  const ingest = path.join(__dirname, 'ingest.js')
  const cmd    = source ? `node "${ingest}" "${path.resolve(source)}"` : `node "${ingest}"`
  execSync(cmd, { stdio: 'inherit', cwd: ROOT })
}


function run_build() {
  /** Run next build and report result. */
  console.log('\nBuilding...')
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: ROOT })
    console.log('Build succeeded.\n')
  } catch {
    console.error('Build failed.\n')
    process.exit(1)
  }
}


// --- Main ---

const { source, build } = parse_args()
console.log('\nRunning setup...')
check_node()
check_npm_installed()
run_ingest(source)
if (build) run_build()
console.log('Setup complete.\n')
