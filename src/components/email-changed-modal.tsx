import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Modal, Platform, StyleSheet, Text, View } from 'react-native'

import Button from '@/components/button'
import { radius } from '@/constants/theme'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'

// Pop-up shown anywhere in the app once a pending email change has been confirmed
export default function EmailChangedModal() {
  const { colors } = useTheme()
  const { emailChangedTo, dismissEmailChanged } = useAuth()

  const onRestart = () => {
    dismissEmailChanged()
    if (Platform.OS === 'web') {
      window.location.reload()
      return
    }
    // Start again from the dashboard so every screen reloads with the new account details
    if (router.canDismiss()) router.dismissAll()
    router.replace('/dashboard')
  }

  return (
    <Modal visible={!!emailChangedTo} animationType="fade" transparent onRequestClose={onRestart}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Email changed</Text>
          <Text style={[styles.body, { color: colors.secondary }]}>
            Your email was successfully changed to{' '}
            <Text style={[styles.email, { color: colors.text }]}>{emailChangedTo}</Text>. Kindly restart the app.
          </Text>
          <View style={styles.button}>
            <Button icon="refresh" onPress={onRestart}>
              Restart app
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius + 6,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 12,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  email: {
    fontWeight: '700',
  },
  button: {
    width: '100%',
    marginTop: 10,
  },
})
