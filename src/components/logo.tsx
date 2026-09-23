import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

export default function Logo() {
  const { colors } = useTheme()

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `0 0 40px ${colors.glow}`,
        },
      ]}
    >
      <Image
        source={require('@/assets/images/clinic-care-logo.svg')}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="Clinic Care logo"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  image: {
    width: 96,
    height: 96,
  },
})
