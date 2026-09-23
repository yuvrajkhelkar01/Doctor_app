import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router, Stack } from 'expo-router'

import BackButton from '@/components/back-button'
import Background from '@/components/background'
import Button from '@/components/button'
import Header from '@/components/header'
import Logo from '@/components/logo'
import TextInput from '@/components/text-input'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/providers/theme-provider'
import { emailValidator, passwordValidator } from '@/utils/validators'

export default function LoginScreen() {
  const { colors } = useTheme()
  const [email, setEmail] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const onLoginPressed = async () => {
    setFormError('')
    const emailError = emailValidator(email.value)
    const passwordError = passwordValidator(password.value)
    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    setLoading(false)
    if (error) {
      setFormError(error.message)
      return
    }
    if (router.canDismiss()) router.dismissAll()
    router.replace('/dashboard')
  }

  return (
    <Background>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <Logo />
      <Header>Welcome back.</Header>
      <TextInput
        label="Email"
        returnKeyType="next"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: '' })}
        errorText={email.error}
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      <TextInput
        label="Password"
        returnKeyType="done"
        value={password.value}
        onChangeText={(text) => setPassword({ value: text, error: '' })}
        onSubmitEditing={onLoginPressed}
        errorText={password.error}
        autoComplete="password"
        textContentType="password"
        secureTextEntry
      />
      <View style={styles.forgotPassword}>
        <Pressable onPress={() => router.push('/reset-password')}>
          <Text style={[styles.forgot, { color: colors.secondary }]}>Forgot your password?</Text>
        </Pressable>
      </View>
      {formError ? (
        <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text>
      ) : null}
      <Button mode="contained" onPress={onLoginPressed} loading={loading}>
        Login
      </Button>
      <View style={styles.row}>
        <Text style={{ color: colors.secondary }}>Don’t have an account? </Text>
        <Pressable onPress={() => router.replace('/register')}>
          <Text style={[styles.link, { color: colors.link }]}>Sign up</Text>
        </Pressable>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  forgotPassword: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  formError: {
    width: '100%',
    fontSize: 13,
    textAlign: 'center',
  },
  forgot: {
    fontSize: 13,
  },
  link: {
    fontWeight: 'bold',
  },
})
