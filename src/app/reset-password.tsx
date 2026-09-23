import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

// Placeholder route so the login screen's links resolve. Replace when this screen is built.
export default function ResetPasswordScreen() {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <Text style={{ color: colors.secondary }}>Reset password (coming soon)</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
