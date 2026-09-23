import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'

type Props = {
  children: string
  onPress: () => void
  mode?: 'contained' | 'outlined'
  icon?: ComponentProps<typeof Ionicons>['name']
  loading?: boolean
}

export default function Button({
  children,
  onPress,
  mode = 'contained',
  icon,
  loading = false,
}: Props) {
  const { colors } = useTheme()
  const contained = mode === 'contained'
  const textColor = contained ? colors.onPrimary : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        contained
          ? { backgroundColor: colors.primary, boxShadow: `0 8px 24px ${colors.glow}` }
          : { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
        (pressed || loading) && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor} /> : null}
      {icon && !loading ? <Ionicons name={icon} size={18} color={textColor} /> : null}
      <Text style={[styles.text, { color: textColor }]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
    paddingVertical: 15,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontWeight: '600',
    fontSize: 15,
  },
})
