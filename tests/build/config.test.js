/**
 * Unit tests for YAML config loading, theme preset resolution, and
 * site.config.js generation. Imports directly from scripts/config and scripts/theme.
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const { load_config, write_site_config } = require('../../scripts/config')
const { COLOR_PRESETS, TYPESETS, resolve_theme } = require('../../scripts/theme')


let tmp
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdsite-config-')) })
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

function write_yaml(body) {
  const p = path.join(tmp, 'mdsite.yaml')
  fs.writeFileSync(p, body)
  return p
}


describe('load_config — theme resolution', () => {
  test('test_theme_defaults_applied', () => {
    /** Config without a theme block resolves to the default Nextra palette and sans typeset. */
    const cfg = load_config(write_yaml('title: t'))
    expect(cfg.theme).toEqual({
      color: 'default', typeset: 'sans', navbar: '', footer: '',
      hue: { light: 212, dark: 204 }, saturation: 100, font_stack: '',
    })
  })

  test('test_theme_navbar_footer_passthrough', () => {
    /** navbar/footer accept 'primary' or any CSS color and pass through unchanged. */
    const cfg = load_config(write_yaml('title: t\ntheme:\n  navbar: primary\n  footer: "#1e293b"'))
    expect(cfg.theme.navbar).toBe('primary')
    expect(cfg.theme.footer).toBe('#1e293b')
  })

  test('test_theme_partial_block_merges_defaults', () => {
    /** A theme block with only color keeps the default typeset. */
    const cfg = load_config(write_yaml('title: t\ntheme:\n  color: teal'))
    expect(cfg.theme.color).toBe('teal')
    expect(cfg.theme.typeset).toBe('sans')
  })

  test('test_theme_invalid_color_throws', () => {
    /** Unknown color preset fails the build with the list of valid names. */
    const p = write_yaml('title: t\ntheme:\n  color: fuchsia')
    expect(() => load_config(p)).toThrow(/unknown theme\.color 'fuchsia'.*default, slate/)
  })

  test('test_theme_invalid_typeset_throws', () => {
    /** Unknown typeset fails the build with the list of valid names. */
    const p = write_yaml('title: t\ntheme:\n  typeset: comic')
    expect(() => load_config(p)).toThrow(/unknown theme\.typeset 'comic'.*sans, serif/)
  })
})


describe('resolve_theme — preset tables', () => {
  test.each(Object.entries(COLOR_PRESETS))(
    'test_theme_color_preset_%s', (name, preset) => {
      /** Each color preset resolves to its table hue and saturation. */
      const theme = resolve_theme({ color: name, typeset: 'sans' })
      expect(theme.hue).toEqual(preset.hue)
      expect(theme.saturation).toBe(preset.saturation)
    }
  )

  test.each(Object.entries(TYPESETS))(
    'test_theme_typeset_preset_%s', (name, stack) => {
      /** Each typeset preset resolves to its font stack ('' keeps the Nextra default). */
      expect(resolve_theme({ color: 'default', typeset: name }).font_stack).toBe(stack)
    }
  )
})


describe('write_site_config — generated keys', () => {
  test('test_write_site_config_includes_new_keys', () => {
    /** Generated site.config.js carries resolved theme, footer, and description. */
    const cfg = load_config(write_yaml('title: t\ndescription: d\nfooter: f\ntheme:\n  color: emerald'))
    write_site_config(cfg, tmp)
    const out = require(path.join(tmp, 'site.config.js'))
    expect(out.description).toBe('d')
    expect(out.footer).toBe('f')
    expect(out.theme).toEqual({
      color: 'emerald', typeset: 'sans', navbar: '', footer: '',
      hue: 161, saturation: 94, font_stack: '',
    })
  })

  test('test_write_site_config_omits_dead_keys', () => {
    /** Removed keys (content_style, theme_mood, logo_seed) never reach site.config.js. */
    write_site_config(load_config(write_yaml('title: t')), tmp)
    const out = require(path.join(tmp, 'site.config.js'))
    expect(out).not.toHaveProperty('content_style')
    expect(out).not.toHaveProperty('theme_mood')
    expect(out).not.toHaveProperty('logo_seed')
  })
})
