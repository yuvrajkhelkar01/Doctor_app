import Ionicons from '@expo/vector-icons/Ionicons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'

import Background from '@/components/background'
import Button from '@/components/button'
import Header from '@/components/header'
import Logo from '@/components/logo'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/providers/theme-provider'

// Opened from the Confirm / Cancel buttons in the sign-up email.
// Nothing happens on a plain link fetch: confirming runs in the app, and
// cancelling needs one more tap, so email link scanners can't trigger either.
type Status =
  | 'confirming'
  | 'confirmed'
  | 'confirm-failed'
  | 'cancel-prompt'
  | 'cancelling'
  | 'cancelled'
  | 'cancel-failed'

export default function ConfirmSignupScreen() {
  const { colors } = useTheme()
  const params = useLocalSearchParams<{ token_hash?: string; action?: string }>()
  const tokenHash = params.token_hash ?? ''
  const isCancel = params.action === 'cancel'
  const [status, setStatus] = useState<Status>(isCancel ? 'cancel-prompt' : 'confirming')
  const [errorMessage, setErrorMessage] = useState('')
  // Tokens are single-use; don't verify twice (e.g. React's dev double-run of effects)
  const started = useRef(false)

  useEffect(() => {
    if (isCancel || started.current) return
    started.current = true

    if (!tokenHash) {
      Promise.resolve().then(() => {
        setErrorMessage('This link is missing its confirmation code.')
        setStatus('confirm-failed')
      })
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' }).then(({ error }) => {
      if (error) {
        setErrorMessage(error.message)
        setStatus('confirm-failed')
        return
      }
      setStatus('confirmed')
    })
  }, [isCancel, tokenHash])

  const onCancelPressed = async () => {
    setStatus('cancelling')
    const { data, error } = await supabase.rpc('cancel_signup', { token_hash: tokenHash })
    if (error || !data) {
      setErrorMessage(
        error?.message ??
          'This link is no longer valid. The account may already be confirmed or cancelled.',
      )
      setStatus('cancel-failed')
      return
    }
    setStatus('cancelled')
  }

  const goToDashboard = () => {
    if (router.canDismiss()) router.dismissAll()
    router.replace('/dashboard')
  }

  const goToLogin = () => {
    if (router.canDismiss()) router.dismissAll()
    router.replace('/login')
  }

  return (
    <Background>
      <Stack.Screen options={{ headerShown: false }} />
      <Logo />

      {status === 'confirming' || status === 'cancelling' ? (
        <>
          <Header>{status === 'confirming' ? 'Confirming…' : 'Cancelling…'}</Header>
          <ActivityIndicator color={colors.primary} />
        </>
      ) : null}

      {status === 'confirmed' ? (
        <>
          <StatusIcon name="checkmark-circle" color={colors.primary} />
          <Header>Account confirmed</Header>
          <Message>Welcome to Clinic Care. Your doctor account is ready.</Message>
          <Button onPress={goToDashboard}>Continue</Button>
        </>
      ) : null}

      {status === 'confirm-failed' ? (
        <>
          <StatusIcon name="alert-circle" color={colors.error} />
          <Header>Couldn’t confirm</Header>
          <Message>{errorMessage} If you already confirmed, just log in.</Message>
          <Button onPress={goToLogin}>Go to Login</Button>
        </>
      ) : null}

      {status === 'cancel-prompt' ? (
        <>
          <StatusIcon name="help-circle" color={colors.secondary} />
          <Header>Cancel account creation?</Header>
          <Message>This deletes the account and the details entered during sign-up.</Message>
          <Button onPress={onCancelPressed}>Yes, cancel sign-up</Button>
          <Button
            mode="outlined"
            onPress={() => {
              setStatus('confirming')
              router.setParams({ action: 'confirm' })
            }}
          >
            No, confirm my account
          </Button>
        </>
      ) : null}

      {status === 'cancelled' ? (
        <>
          <StatusIcon name="close-circle" color={colors.secondary} />
          <Header>Sign-up cancelled</Header>
          <Message>The account and its details have been deleted.</Message>
          <Button mode="outlined" onPress={goToLogin}>
            Done
          </Button>
        </>
      ) : null}

      {status === 'cancel-failed' ? (
        <>
          <StatusIcon name="alert-circle" color={colors.error} />
          <Header>Couldn’t cancel</Header>
          <Message>{errorMessage}</Message>
          <Button mode="outlined" onPress={goToLogin}>
            Go to Login
          </Button>
        </>
      ) : null}
    </Background>
  )
}

function StatusIcon({ name, color }: { name: ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons name={name} size={48} color={color} style={styles.icon} />
}

function Message({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return <Text style={[styles.message, { color: colors.secondary }]}>{children}</Text>
}

const styles = StyleSheet.create({
  icon: {
    marginTop: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
})
