export interface ThemeColor {
  /** 用户选择的颜色 hex */
  color: string
  /** 派生的 100~900 色调，供全局使用 */
  palette: {
    '50': string
    '100': string
    '200': string
    '300': string
    '400': string
    '500': string
    '600': string
    '700': string
    '800': string
    '900': string
  }
  /** 浅色背景 */
  bgLight: string
  /** 主背景 */
  bg: string
  /** 卡片背景 */
  cardBg: string
  /** 文字色 */
  text: string
  /** 次要文字 */
  textMuted: string
  /** 强调色（按钮/链接） */
  accent: string
  /** 强调色文字 */
  accentText: string
  /** 边框色 */
  border: string
  /** 渐变起始 */
  gradientStart: string
  /** 渐变结束 */
  gradientEnd: string
  /** 阴影色 */
  shadow: string
  /** 输入框背景 */
  inputBg: string
}

/** 12 种预设色板 */
export const PRESET_COLORS = [
  { key: 'storm', name: '风暴蓝', hex: '#8BB5DE' },
  { key: 'forest', name: '森林绿', hex: '#A8C8A8' },
  { key: 'pink', name: '玫瑰粉', hex: '#D4A5A5' },
  { key: 'lavender', name: '薰衣草', hex: '#C8A8D8' },
  { key: 'yellow', name: '咸阳黄', hex: '#F0C674' },
  { key: 'silver', name: '月光银', hex: '#B8B8B8' },
  { key: 'orange', name: '珊瑚橙', hex: '#D8A8A8' },
  { key: 'cyan', name: '海湾青', hex: '#A8D8D8' },
  { key: 'lime', name: '橄榄绿', hex: '#C8C8A8' },
  { key: 'milktea', name: '奶茶红', hex: '#D8C8A8' },
  { key: 'purple', name: '梦幻紫', hex: '#A8A8D8' },
  { key: 'matcha', name: '抹茶绿', hex: '#C8D8A8' }
] as const

/** 将 hex 转成 RGB 数字 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const parsed = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255]
}

/** 将 RGB 转成 hex */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

/** 混合两个颜色 */
function mixColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ]
}

/** 计算亮度 */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** 调整饱和度 */
function saturate(c: [number, number, number], factor: number): [number, number, number] {
  const gray = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  return [
    Math.max(0, Math.min(255, gray + (c[0] - gray) * factor)),
    Math.max(0, Math.min(255, gray + (c[1] - gray) * factor)),
    Math.max(0, Math.min(255, gray + (c[2] - gray) * factor))
  ]
}

/**
 * 从单个 hex 颜色生成完整的主题色板
 * 保持色调一致，通过明度和饱和度变化生成 100~900
 */
export function deriveTheme(color: string): ThemeColor {
  const base = hexToRgb(color)

  // 提高饱和度让颜色更鲜明
  const baseSat = saturate(base, 1.35)

  // 100~900：从浅色到深色，保持 hue
  const lightMix = [248, 250, 252] // gray-50
  const darkMix = [15, 23, 42] // slate-900

  const levels = [
    { t: 0.95, s: 0.5 },
    { t: 0.85, s: 0.7 },
    { t: 0.65, s: 0.85 },
    { t: 0.45, s: 1.0 },
    { t: 0.25, s: 1.15 },
    { t: 0.10, s: 1.3 },
    { t: -0.15, s: 1.2 },
    { t: -0.35, s: 1.1 },
    { t: -0.6, s: 1.0 }
  ]

  const palette: Record<string, string> = {}
  levels.forEach((l, i) => {
    const step = (i + 1) * 100
    const target = l.t >= 0
      ? mixColor(lightMix, baseSat, l.t)
      : mixColor(baseSat, darkMix, -l.t)
    const final = saturate(target, l.s)
    palette[String(step)] = rgbToHex(final[0], final[1], final[2])
  })

  // 背景：非常浅的色调
  const bgRgb = mixColor(lightMix, baseSat, 0.12)
  const bgLight = rgbToHex(bgRgb[0], bgRgb[1], bgRgb[2])
  const cardBg = '#FFFFFF'
  const inputBg = palette['50']

  // 文字：深色（因为背景浅）
  const text = '#1F2937'
  const textMuted = '#9CA3AF'

  // 强调色
  const accent = palette['500']
  const accentText = luminance(...baseSat) > 0.4 ? '#FFFFFF' : '#1F2937'

  // 边框
  const border = palette['200']

  // 渐变：浅色到中等色调
  const gradientStart = palette['200']
  const gradientEnd = palette['500']

  // 阴影
  const shadow = `rgba(${baseSat[0]}, ${baseSat[1]}, ${baseSat[2]}, 0.12)`

  return {
    color,
    palette,
    bgLight,
    bg: palette['50'],
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
