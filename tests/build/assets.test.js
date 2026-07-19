/**
 * Tests for the consumer assets extension point: mdsite.yaml `assets:` dir is
 * mirrored into public/assets/ each build so pages can fetch static data files.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { sync_assets } = require('../../scripts/ingest')


const ASSETS = path.join(__dirname, '..', '..', 'public', 'assets')

let src_dir

beforeEach(() => {
  src_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdsite-assets-'))
})

afterEach(() => {
  fs.rmSync(src_dir, { recursive: true, force: true })
  fs.rmSync(ASSETS, { recursive: true, force: true })
})


test('test_sync_copies_assets_recursively', () => {
  /** Any file type is mirrored into public/assets/, subdirectories included. */
  fs.writeFileSync(path.join(src_dir, 'graph.json'), '{}')
  fs.mkdirSync(path.join(src_dir, 'data'))
  fs.writeFileSync(path.join(src_dir, 'data', 'extra.csv'), 'a,b')

  const copied = sync_assets(src_dir)
  expect(copied.sort()).toEqual(['data', 'graph.json'])
  expect(fs.existsSync(path.join(ASSETS, 'graph.json'))).toBe(true)
  expect(fs.existsSync(path.join(ASSETS, 'data', 'extra.csv'))).toBe(true)
})

test('test_sync_cleans_stale_assets', () => {
  /** Files from a previous build are removed when no longer in the source dir. */
  fs.writeFileSync(path.join(src_dir, 'old.json'), '{}')
  sync_assets(src_dir)

  fs.rmSync(path.join(src_dir, 'old.json'))
  fs.writeFileSync(path.join(src_dir, 'new.json'), '{}')
  sync_assets(src_dir)

  expect(fs.existsSync(path.join(ASSETS, 'old.json'))).toBe(false)
  expect(fs.existsSync(path.join(ASSETS, 'new.json'))).toBe(true)
})

test('test_sync_unset_config_removes_dir', () => {
  /** No assets config copies nothing and leaves no public/assets/ dir. */
  expect(sync_assets('')).toEqual([])
  expect(fs.existsSync(ASSETS)).toBe(false)
})
