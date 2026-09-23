import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

export default function BackButton() {
  const { colors } = useTheme()
  if (!router.canGoBack()) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => router.back()}
      style={styles.container}
    >
      <Ionicons name="arrow-back" size={24} color={colors.secondary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 4,
    zIndex: 1,
  },
})
