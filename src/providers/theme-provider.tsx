import { createContext, useContext, useState, type PropsWithChildren } from 'react'
import { useColorScheme } from 'react-native'

import { palettes, type ThemeColors, type ThemeMode } from '@/constants/theme'

type ThemeContextValue = {
  mode: ThemeMode
  colors: ThemeColors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme()
  // null = follow the system until the user picks a theme
  const [override, setOverride] = useState<ThemeMode | null>(null)
  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light')

  const toggleTheme = () => setOverride(mode === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ mode, colors: palettes[mode], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
