import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'

import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import TextInput from '@/components/text-input'
import { changePassword } from '@/lib/account'
import { useTheme } from '@/providers/theme-provider'
import { confirmPasswordValidator, passwordValidator } from '@/utils/validators'

type Props = {
  visible: boolean
  email: string
  onClose: () => void
  onChanged: () => void
}

const emptyField = { value: '', error: '' }

export default function ChangePasswordSheet({ visible, email, onClose, onChanged }: Props) {
  const { colors } = useTheme()
  const [current, setCurrent] = useState(emptyField)
  const [next, setNext] = useState(emptyField)
  const [confirm, setConfirm] = useState(emptyField)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Start with empty fields each time the sheet opens
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setCurrent(emptyField)
      setNext(emptyField)
      setConfirm(emptyField)
      setError('')
    }
  }

  const onSave = async () => {
    const currentError = current.value ? '' : 'Enter your current password.'
    const nextError =
      passwordValidator(next.value) ||
      (next.value === current.value ? 'Choose a password different from your current one.' : '')
    const confirmError = confirmPasswordValidator(next.value, confirm.value)
    if (currentError || nextError || confirmError) {
      setCurrent({ ...current, error: currentError })
      setNext({ ...next, error: nextError })
      setConfirm({ ...confirm, error: confirmError })
      return
    }

    setSaving(true)
    setError('')
    const message = await changePassword(email, current.value, next.value)
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    onChanged()
    onClose()
  }

  return (
    <BottomSheet visible={visible} title="Change password" onClose={() => !saving && onClose()}>
      <TextInput
        label="Current password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        value={current.value}
        errorText={current.error}
        onChangeText={(value) => setCurrent({ value, error: '' })}
      />
      <TextInput
        label="New password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={next.value}
        errorText={next.error}
        onChangeText={(value) => setNext({ value, error: '' })}
      />
      <TextInput
        label="Confirm new password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirm.value}
        errorText={confirm.error}
        onChangeText={(value) => setConfirm({ value, error: '' })}
        onSubmitEditing={onSave}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <Button icon="key-outline" loading={saving} onPress={onSave}>
        Update password
      </Button>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
})
