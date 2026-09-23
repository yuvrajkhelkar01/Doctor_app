import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'

type Props = {
  icon: ComponentProps<typeof Ionicons>['name']
  title: string
  description: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  // Red styling for actions like delete
  destructive?: boolean
}

// A tappable choice in a bottom sheet: icon badge, title, description and a chevron
export default function OptionRow({ icon, title, description, onPress, loading = false, disabled = false, destructive = false }: Props) {
  const { colors } = useTheme()
  const tint = destructive ? colors.error : colors.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: destructive ? colors.error : colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.secondary }]}>{description}</Text>
      </View>
      {loading ? <ActivityIndicator color={tint} /> : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
  },
})
