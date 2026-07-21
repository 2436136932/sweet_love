import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode
} from 'react'
import { ThemeColor, deriveTheme, PRESET_COLORS } from '../lib/theme'
import { coupleService } from '../services/api'

export interface ThemeConfig {
  enabled: boolean
  color: string
}

interface ThemeContextValue {
  config: ThemeConfig | null
  loading: boolean
  activeTheme: ThemeColor
  selectedColor: string
  setSelectedColor: (color: string) => void
  saveTheme: () => Promise<void>
  applyPreset: (hex: string) => Promise<void>
  presets: typeof PRESET_COLORS
}

const defaultTheme = deriveTheme('#D4A5A5') // 默认玫瑰粉
const DefaultContext: ThemeContextValue = {
  config: null,
  loading: true,
  activeTheme: defaultTheme,
  selectedColor: '#D4A5A5',
  setSelectedColor: () => {},
  saveTheme: async () => {},
  applyPreset: async () => {},
  presets: PRESET_COLORS
}

export const ThemeContext = createContext<ThemeContextValue>(DefaultContext)

export function ThemeProvider({
  children,
  coupleId
}: {
  children: ReactNode
  coupleId?: string
}) {
  const [config, setConfig] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedColor, setSelectedColor] = useState('#D4A5A5')

  const activeTheme = useMemo(() => deriveTheme(selectedColor), [selectedColor])

  useEffect(() => {
    if (!coupleId) {
      setLoading(false)
      return
    }
    setLoading(true)
    coupleService
      .getThemeConfig()
      .then((data) => {
        if (data && data.enabled) {
          setConfig(data)
          setSelectedColor(data.color)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [coupleId])

  const saveTheme = useCallback(async () => {
    try {
      await coupleService.updateThemeConfig({
        enabled: true,
        color: selectedColor
      })
      setConfig({ enabled: true, color: selectedColor })
    } catch (err) {
      console.error('Save theme failed', err)
    }
  }, [selectedColor])

  const applyPreset = useCallback(async (hex: string) => {
    setSelectedColor(hex)
    try {
      await coupleService.updateThemeConfig({ enabled: true, color: hex })
      setConfig({ enabled: true, color: hex })
    } catch (err) {
      console.error('Apply preset failed', err)
    }
  }, [])

  // 注入 CSS 变量到 :root
  useEffect(() => {
    const vars = activeTheme
    const root = document.documentElement
    Object.entries(vars.palette).forEach(([k, v]) => {
      root.style.setProperty(`--theme-${k}`, v)
    })
    root.style.setProperty('--theme-bg', vars.bg)
    root.style.setProperty('--theme-bg-light', vars.bgLight)
    root.style.setProperty('--theme-card-bg', vars.cardBg)
    root.style.setProperty('--theme-text', vars.text)
    root.style.setProperty('--theme-text-muted', vars.textMuted)
    root.style.setProperty('--theme-accent', vars.accent)
    root.style.setProperty('--theme-accent-text', vars.accentText)
    root.style.setProperty('--theme-border', vars.border)
    root.style.setProperty('--theme-gradient-start', vars.gradientStart)
    root.style.setProperty('--theme-gradient-end', vars.gradientEnd)
    root.style.setProperty('--theme-shadow', vars.shadow)
    root.style.setProperty('--theme-input-bg', vars.inputBg)
  }, [activeTheme])

  const value = useMemo(
    () => ({
      config,
      loading,
      activeTheme,
      selectedColor,
      setSelectedColor,
      saveTheme,
      applyPreset,
      presets: PRESET_COLORS
    }),
    [
      config,
      loading,
      activeTheme,
      selectedColor,
      setSelectedColor,
      saveTheme,
      applyPreset
    ]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

export { PRESET_COLORS }
