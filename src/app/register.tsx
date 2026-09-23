import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { createURL } from 'expo-linking'
import { router, Stack } from 'expo-router'

import BackButton from '@/components/back-button'
import Background from '@/components/background'
import Button from '@/components/button'
import Header from '@/components/header'
import Logo from '@/components/logo'
import PhoneInput from '@/components/phone-input'
import TextInput from '@/components/text-input'
import { defaultCountry } from '@/constants/countries'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/providers/theme-provider'
import {
  confirmPasswordValidator,
  emailValidator,
  nameValidator,
  passwordValidator,
  phoneValidator,
} from '@/utils/validators'

export default function RegisterScreen() {
  const { colors } = useTheme()
  const [firstName, setFirstName] = useState({ value: '', error: '' })
  const [lastName, setLastName] = useState({ value: '', error: '' })
  const [email, setEmail] = useState({ value: '', error: '' })
  const [country, setCountry] = useState(defaultCountry)
  const [phone, setPhone] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  const [confirmPassword, setConfirmPassword] = useState({ value: '', error: '' })

  const [socialNotice, setSocialNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const onGooglePressed = () => {
    // TODO: wire up once the auth provider is chosen
    setSocialNotice('Google sign-up is coming soon.')
  }

  const onSignUpPressed = async () => {
    setFormError('')
    setFormNotice('')
    const firstNameError = nameValidator(firstName.value, 'First name')
    const lastNameError = nameValidator(lastName.value, 'Last name')
    const emailError = emailValidator(email.value)
    const phoneError = phoneValidator(phone.value, country.length)
    const passwordError = passwordValidator(password.value)
    const confirmPasswordError = confirmPasswordValidator(password.value, confirmPassword.value)
    if (
      firstNameError ||
      lastNameError ||
      emailError ||
      phoneError ||
      passwordError ||
      confirmPasswordError
    ) {
      setFirstName({ ...firstName, error: firstNameError })
      setLastName({ ...lastName, error: lastNameError })
      setEmail({ ...email, error: emailError })
      setPhone({ ...phone, error: phoneError })
      setPassword({ ...password, error: passwordError })
      setConfirmPassword({ ...confirmPassword, error: confirmPasswordError })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        // Base URL for the email's Confirm/Cancel buttons: the app's confirm-signup screen
        // (doctorapp://confirm-signup in builds, exp://…/--/confirm-signup in Expo Go, web path on web)
        emailRedirectTo: createURL('/confirm-signup'),
        data: {
          first_name: firstName.value.trim(),
          last_name: lastName.value.trim(),
          mobile_number: `${country.dialCode}${phone.value}`,
        },
      },
    })
    setLoading(false)
    if (error) {
      setFormError(error.message)
      return
    }
    // No session means Supabase wants the email confirmed first
    if (!data.session) {
      setFormNotice(`We sent an email to ${email.value.trim()}. Open it and tap Confirm to finish creating your account.`)
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
      <Header>Create Account</Header>
      <TextInput
        label="First Name"
        returnKeyType="next"
        value={firstName.value}
        onChangeText={(text) => setFirstName({ value: text, error: '' })}
        errorText={firstName.error}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <TextInput
        label="Last Name"
        returnKeyType="next"
        value={lastName.value}
        onChangeText={(text) => setLastName({ value: text, error: '' })}
        errorText={lastName.error}
        autoComplete="family-name"
        textContentType="familyName"
      />
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
      <PhoneInput
        label="Phone Number"
        country={country}
        onCountryChange={(c) => {
          setCountry(c)
          setPhone({ ...phone, error: '' })
        }}
        value={phone.value}
        onChangeText={(text) => setPhone({ value: text, error: '' })}
        errorText={phone.error}
      />
      <TextInput
        label="Password"
        returnKeyType="next"
        value={password.value}
        onChangeText={(text) => setPassword({ value: text, error: '' })}
        errorText={password.error}
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
      />
      <TextInput
        label="Confirm Password"
        returnKeyType="done"
        value={confirmPassword.value}
        onChangeText={(text) => setConfirmPassword({ value: text, error: '' })}
        onSubmitEditing={onSignUpPressed}
        errorText={confirmPassword.error}
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
      />
      <View style={styles.spacer} />
      {formError ? (
        <Text style={[styles.formMessage, { color: colors.error }]}>{formError}</Text>
      ) : null}
      {formNotice ? (
        <Text style={[styles.formMessage, { color: colors.link }]}>{formNotice}</Text>
      ) : null}
      <Button mode="contained" onPress={onSignUpPressed} loading={loading}>
        Sign Up
      </Button>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.muted }]}>or</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
      <Button mode="outlined" icon="logo-google" onPress={onGooglePressed}>
        Sign up with Google
      </Button>
      {socialNotice ? (
        <Text style={[styles.notice, { color: colors.secondary }]}>{socialNotice}</Text>
      ) : null}
      <View style={styles.row}>
        <Text style={{ color: colors.secondary }}>Already have an account? </Text>
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={[styles.link, { color: colors.link }]}>Login</Text>
        </Pressable>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  spacer: {
    height: 12,
  },
  formMessage: {
    width: '100%',
    fontSize: 13,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
  },
  notice: {
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  link: {
    fontWeight: 'bold',
  },
})
