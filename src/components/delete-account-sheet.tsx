import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import TextInput from '@/components/text-input'
import { radius } from '@/constants/theme'
import { deleteAccount } from '@/lib/account'
import { useTheme } from '@/providers/theme-provider'

type Props = {
  visible: boolean
  userId: string
  email: string
  onClose: () => void
}

// Permanently deletes the doctor's account and everything in it, after they re-enter their password.
// On success the session ends and the app returns to the login screen.
export default function DeleteAccountSheet({ visible, userId, email, onClose }: Props) {
  const { colors } = useTheme()
  const [password, setPassword] = useState({ value: '', error: '' })
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setPassword({ value: '', error: '' })
      setError('')
    }
  }

  const onDelete = async () => {
    if (!password.value) {
      setPassword({ ...password, error: 'Enter your password to confirm.' })
      return
    }
    setDeleting(true)
    setError('')
    const message = await deleteAccount(userId, email, password.value)
    // On success the session is gone and the screen redirects to login
    if (message) {
      setDeleting(false)
      setError(message)
    }
  }

  return (
    <BottomSheet visible={visible} title="Delete account" subtitle={email} onClose={() => !deleting && onClose()}>
      <View style={[styles.warning, { backgroundColor: colors.surface, borderColor: colors.error }]}>
        <Ionicons name="warning-outline" size={24} color={colors.error} />
        <View style={styles.warningBody}>
          <Text style={[styles.warningTitle, { color: colors.text }]}>This can&apos;t be undone</Text>
          <Text style={[styles.warningText, { color: colors.secondary }]}>
            Your account, profile, all patients, case studies, visits and appointments will be permanently deleted.
          </Text>
        </View>
      </View>
      <TextInput
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        value={password.value}
        errorText={password.error}
        onChangeText={(value) => setPassword({ value, error: '' })}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: deleting, disabled: deleting }}
        disabled={deleting}
        onPress={onDelete}
        style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error, opacity: pressed || deleting ? 0.8 : 1 }]}
      >
        {deleting ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Ionicons name="trash" size={18} color={colors.onPrimary} />}
        <Text style={[styles.deleteText, { color: colors.onPrimary }]}>Delete my account</Text>
      </Pressable>
      <Button mode="outlined" onPress={() => !deleting && onClose()}>
        Keep my account
      </Button>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginTop: 8,
  },
  warningBody: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
    paddingVertical: 15,
    borderRadius: radius,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
