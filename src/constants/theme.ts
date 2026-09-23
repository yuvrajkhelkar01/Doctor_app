export type ThemeMode = 'light' | 'dark'

export type ThemeColors = {
  primary: string
  link: string
  glow: string
  onPrimary: string
  background: string
  surface: string
  surfaceRaised: string
  border: string
  text: string
  secondary: string
  muted: string
  error: string
  warning: string
  warningSurface: string
}

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: {
    primary: '#6F63D6',
    link: '#6F63D6',
    glow: 'rgba(111, 99, 214, 0.30)',
    onPrimary: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#F3F1FE',
    surfaceRaised: '#E9E6FC',
    border: '#DEDAF7',
    text: '#1B1A33',
    secondary: '#6B6A85',
    muted: '#A3A1B8',
    error: '#DC2626',
    warning: '#B45309',
    warningSurface: '#FEF6E7',
  },
  dark: {
    primary: '#8B5CF6',
    link: '#A78BFA',
    glow: 'rgba(139, 92, 246, 0.45)',
    onPrimary: '#FFFFFF',
    background: '#0B0A10',
    surface: '#16141F',
    surfaceRaised: '#1E1B2B',
    border: '#2A2638',
    text: '#F4F2FA',
    secondary: '#A09CB0',
    muted: '#6E6A7D',
    error: '#F87171',
    warning: '#FBBF24',
    warningSurface: 'rgba(251, 191, 36, 0.10)',
  },
}

export const radius = 14
