import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import TextInput from '@/components/text-input'
import { radius } from '@/constants/theme'
import { changeEmail } from '@/lib/account'
import { useTheme } from '@/providers/theme-provider'
import { emailValidator } from '@/utils/validators'

type Props = {
  visible: boolean
  currentEmail: string
  onClose: () => void
}

const emptyField = { value: '', error: '' }

// Moves the login to a new email address. The account stays the same, so all data moves with it.
export default function ChangeEmailSheet({ visible, currentEmail, onClose }: Props) {
  const { colors } = useTheme()
  const [email, setEmail] = useState(emptyField)
  const [password, setPassword] = useState(emptyField)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // The address the confirmation was sent to, once the request succeeds
  const [sentTo, setSentTo] = useState('')

  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setEmail(emptyField)
      setPassword(emptyField)
      setError('')
      setSentTo('')
    }
  }

  const onSave = async () => {
    const newEmail = email.value.trim().toLowerCase()
    const emailError =
      emailValidator(newEmail) || (newEmail === currentEmail.toLowerCase() ? 'This is already your email.' : '')
    const passwordError = password.value ? '' : 'Enter your password to confirm.'
    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }

    setSaving(true)
    setError('')
    const message = await changeEmail(currentEmail, password.value, newEmail)
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    setSentTo(newEmail)
  }

  return (
    <BottomSheet
      visible={visible}
      title="Change email"
      subtitle={sentTo ? undefined : `Currently ${currentEmail}`}
      onClose={() => !saving && onClose()}
    >
      {sentTo ? (
        <>
          <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="mail-unread-outline" size={24} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.text }]}>
              We&apos;ve sent confirmation links to <Text style={styles.bold}>{sentTo}</Text> and{' '}
              <Text style={styles.bold}>{currentEmail}</Text>. Open both to finish the change.{'\n\n'}
              Until then, keep signing in with {currentEmail}.
            </Text>
          </View>
          <Button onPress={onClose}>Done</Button>
        </>
      ) : (
        <>
          <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.secondary }]}>
              Your patients, visits and appointments all stay with your account. Only the email you sign in with
              changes.
            </Text>
          </View>
          <TextInput
            label="New email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email.value}
            errorText={email.error}
            onChangeText={(value) => setEmail({ value, error: '' })}
          />
          <TextInput
            label="Current password"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            value={password.value}
            errorText={password.error}
            onChangeText={(value) => setPassword({ value, error: '' })}
            onSubmitEditing={onSave}
          />
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          <Button icon="mail-outline" loading={saving} onPress={onSave}>
            Send confirmation
          </Button>
        </>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
})
