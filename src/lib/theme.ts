export interface ThemeColor {
  palette: { [key: string]: string }
  bg: string
  bgLight: string
  cardBg: string
  text: string
  textMuted: string
  accent: string
  accentText: string
  border: string
  gradientStart: string
  gradientEnd: string
  shadow: string
  inputBg: string
}

export const PRESET_COLORS = [
  { key: 'rose', name: '玫瑰粉', hex: '#D4A5A5' },
  { key: 'pink', name: '樱花粉', hex: '#F4C2C2' },
  { key: 'red', name: '热恋红', hex: '#E57373' },
  { key: 'coral', name: '珊瑚橙', hex: '#FF8A65' },
  { key: 'orange', name: '日落橙', hex: '#FFB74D' },
  { key: 'amber', name: '琥珀金', hex: '#FFD54F' },
  { key: 'green', name: '薄荷绿', hex: '#81C784' },
  { key: 'teal', name: '青松石', hex: '#4DB6AC' },
  { key: 'blue', name: '晴空蓝', hex: '#64B5F6' },
  { key: 'indigo', name: '鸢尾紫', hex: '#7986CB' },
  { key: 'purple', name: '薰衣草', hex: '#BA68C8' },
  { key: 'slate', name: '简约灰', hex: '#90A4AE' }
]

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16)
  }
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s, l }
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360
  let r: number
  let g: number
  let b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function generatePalette(
  h: number,
  s: number,
  l: number
): Record<string, string> {
  const shades: Record<string, number> = {
    '50': 0.96,
    '100': 0.9,
    '200': 0.82,
    '300': 0.7,
    '400': 0.58,
    '500': l,
    '600': Math.max(0.08, l - 0.12),
    '700': Math.max(0.06, l - 0.2),
    '800': Math.max(0.04, l - 0.28),
    '900': Math.max(0.03, l - 0.34)
  }

  const palette: Record<string, string> = {}
  for (const [key, lightness] of Object.entries(shades)) {
    const saturation = key === '50' || key === '100' ? s * 0.5 : s
    palette[key] = hslToHex(h, saturation, lightness)
  }
  return palette
}

function getContrastText(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#1F2937'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.55 ? '#1F2937' : '#FFFFFF'
}

export function deriveTheme(hex: string): ThemeColor {
  const safeHex = hex?.startsWith('#') ? hex : `#${hex}`
  const rgb = hexToRgb(safeHex)

  if (!rgb) {
    return deriveTheme('#D4A5A5')
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const palette = generatePalette(h, s, l)
  const accent = palette['500']
  const accentText = getContrastText(accent)
  const bg = palette['50']
  const bgLight = palette['100']
  const cardBg = '#FFFFFF'
  const text = '#1F2937'
  const textMuted = '#6B7280'
  const border = palette['200']
  const gradientStart = palette['200']
  const gradientEnd = palette['500']
  const shadow = `${palette['500']}33`
  const inputBg = '#FFFFFF'

  return {
    palette,
    bg,
    bgLight,
    cardBg,
    text,
    textMuted,
    accent,
    accentText,
    border,
    gradientStart,
    gradientEnd,
    shadow,
    inputBg
  }
}
