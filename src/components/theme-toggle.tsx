import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/providers/theme-provider'

export default function ThemeToggle() {
  const { mode, colors, toggleTheme } = useTheme()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'dark'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      hitSlop={8}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.button,
        {
          top: insets.top + 8,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.link} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
})
