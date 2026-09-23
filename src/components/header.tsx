import type { PropsWithChildren } from 'react'
import { StyleSheet, Text } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

export default function Header({ children }: PropsWithChildren) {
  const { colors } = useTheme()

  return <Text style={[styles.header, { color: colors.text }]}>{children}</Text>
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: '500',
    paddingVertical: 12,
  },
})
