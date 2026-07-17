/**
 * Tests for ensure_h1: a title heading is injected only when the body truly
 * lacks an h1, including mdx bodies that open with import statements.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { ensure_h1 } = require('../../scripts/ingest')


let dir

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdsite-h1-')) })

afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })


function write_page(body) {
  const file = path.join(dir, 'page.mdx')
  fs.writeFileSync(file, `---\ntitle: Page\n---\n${body}`)
  return file
}


test('test_h1_injected_when_missing', () => {
  /** Pages without any h1 get the title heading prepended. */
  const file = write_page('Some text only.\n')
  ensure_h1(file, 'Page')
  expect(fs.readFileSync(file, 'utf8')).toContain('# Page')
})

test('test_h1_after_imports_detected', () => {
  /** An h1 below import lines is detected — no duplicate heading injected. */
  const file = write_page(`\nimport Widget from '../components/custom/Widget'\n\n# Page\n\n<Widget />\n`)
  ensure_h1(file, 'Page')
  expect(fs.readFileSync(file, 'utf8').match(/^# Page$/gm)).toHaveLength(1)
})

test('test_h1_inside_code_fence_ignored', () => {
  /** A # line inside a code fence is not an h1; the heading is still injected. */
  const file = write_page('```bash\n# not a heading\n```\n')
  ensure_h1(file, 'Page')
  expect(fs.readFileSync(file, 'utf8')).toContain('# Page')
})
