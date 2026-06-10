const fs   = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../../dist')


test('test_build_out_dir_exists', () => {
  /** out/ directory is present after a successful build. */
  expect(fs.existsSync(OUT)).toBe(true)
})

test('test_build_index_page_exists', () => {
  /** Static export includes the home page. */
  expect(fs.existsSync(path.join(OUT, 'index.html'))).toBe(true)
})

test('test_build_images_copied', () => {
  /** Image assets are present in the exported output. */
  expect(fs.existsSync(path.join(OUT, 'images'))).toBe(true)
})

test('test_build_dir_feeds_copied', () => {
  /** dir-feeds/ JSON is included in the static export. */
  expect(fs.existsSync(path.join(OUT, 'dir-feeds'))).toBe(true)
})
