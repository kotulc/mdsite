/**
 * Theme preset tables for the mdsite CLI.
 * Maps named color palettes to Nextra primaryHue/primarySaturation values and named
 * typesets to system font stacks, resolving a mdsite.yaml theme block for site.config.js.
 */


// Palette name -> { hue, saturation }; hues follow Tailwind 600-level colors
const COLOR_PRESETS = {
  default: { hue: { light: 212, dark: 204 }, saturation: 100 },
  slate:   { hue: 215, saturation: 19 },
  gray:    { hue: 220, saturation: 9 },
  blue:    { hue: 221, saturation: 83 },
  indigo:  { hue: 243, saturation: 75 },
  violet:  { hue: 262, saturation: 83 },
  rose:    { hue: 347, saturation: 77 },
  orange:  { hue: 21,  saturation: 90 },
  amber:   { hue: 38,  saturation: 92 },
  emerald: { hue: 161, saturation: 94 },
  teal:    { hue: 175, saturation: 84 },
  cyan:    { hue: 192, saturation: 91 },
}


// Typeset name -> body font stack; '' keeps Nextra's default sans stack
const TYPESETS = {
  sans:      '',
  serif:     "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif",
  humanist:  "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif",
  geometric: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, 'Segoe UI', sans-serif",
  mono:      "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
}


function resolve_theme(theme) {
  /** Validate a theme block and return { color, typeset, hue, saturation, font_stack }. */
  const { color, typeset } = theme

  if (!(color in COLOR_PRESETS)) {
    throw new Error(`mdsite.yaml: unknown theme.color '${color}' (valid: ${Object.keys(COLOR_PRESETS).join(', ')})`)
  }
  if (!(typeset in TYPESETS)) {
    throw new Error(`mdsite.yaml: unknown theme.typeset '${typeset}' (valid: ${Object.keys(TYPESETS).join(', ')})`)
  }

  const { hue, saturation } = COLOR_PRESETS[color]
  return { color, typeset, hue, saturation, font_stack: TYPESETS[typeset] }
}


module.exports = { COLOR_PRESETS, TYPESETS, resolve_theme }
