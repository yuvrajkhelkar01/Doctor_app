import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  useCameraPermissions,
  type ImagePickerAsset,
} from 'expo-image-picker'
import { Redirect, router, Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import BackButton from '@/components/back-button'
import Background from '@/components/background'
import Button from '@/components/button'
import Header from '@/components/header'
import PhoneInput from '@/components/phone-input'
import TextInput from '@/components/text-input'
import { defaultCountry } from '@/constants/countries'
import { radius } from '@/constants/theme'
import { addPatient } from '@/lib/patients'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { nameValidator, phoneValidator } from '@/utils/validators'

const pickerOptions = { mediaTypes: 'images', quality: 0.7 } as const

export default function AddPatientScreen() {
  const { colors } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [firstName, setFirstName] = useState({ value: '', error: '' })
  const [country, setCountry] = useState(defaultCountry)
  const [phone, setPhone] = useState({ value: '', error: '' })
  const [caseNotes, setCaseNotes] = useState('')
  const [casePhoto, setCasePhoto] = useState<ImagePickerAsset | null>(null)
  const [caseError, setCaseError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (!session) return <Redirect href="/login" />

  const onTakePhoto = async () => {
    setCaseError('')
    // The browser asks for camera access itself
    if (Platform.OS !== 'web' && !cameraPermission?.granted) {
      const { granted } = await requestCameraPermission()
      if (!granted) {
        setCaseError('Camera access is off. Allow it in Settings, or type the case notes instead.')
        return
      }
    }
    const result = await launchCameraAsync(pickerOptions)
    if (!result.canceled) setCasePhoto(result.assets[0])
  }

  const onChoosePhoto = async () => {
    setCaseError('')
    const result = await launchImageLibraryAsync(pickerOptions)
    if (!result.canceled) setCasePhoto(result.assets[0])
  }

  const onSavePressed = async () => {
    setFormError('')
    const firstNameError = nameValidator(firstName.value, 'First name')
    const phoneError = phoneValidator(phone.value, country.length)
    const notes = caseNotes.trim()
    const missingCase = !notes && !casePhoto ? 'Add a case study photo or type the case notes.' : ''
    if (firstNameError || phoneError || missingCase) {
      setFirstName({ ...firstName, error: firstNameError })
      setPhone({ ...phone, error: phoneError })
      setCaseError(missingCase)
      return
    }

    setLoading(true)
    const error = await addPatient({
      doctorId: session.user.id,
      firstName: firstName.value.trim(),
      mobileNumber: `${country.dialCode}${phone.value}`,
      caseNotes: notes,
      casePhoto,
    })
    setLoading(false)
    if (error) {
      setFormError(error)
      return
    }
    if (router.canGoBack()) router.back()
    else router.replace('/dashboard')
  }

  return (
    <Background>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <Header>Add Patient</Header>
      <TextInput
        label="First Name"
        returnKeyType="next"
        value={firstName.value}
        onChangeText={(text) => setFirstName({ value: text, error: '' })}
        errorText={firstName.error}
        autoCapitalize="words"
        autoComplete="off"
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
        autoComplete="off"
      />

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.secondary }]}>Case Study</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>Take a photo, type the notes, or both.</Text>
        {casePhoto ? (
          <View style={[styles.preview, { borderColor: colors.border }]}>
            <Image
              source={{ uri: casePhoto.uri }}
              style={styles.previewImage}
              contentFit="cover"
              accessibilityLabel="Case study photo"
            />
            <Pressable
              accessibilityLabel="Remove case study photo"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setCasePhoto(null)}
              style={[styles.removePhoto, { backgroundColor: colors.background }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <PhotoAction icon="camera-outline" label="Take photo" onPress={onTakePhoto} />
            <PhotoAction icon="images-outline" label="Choose photo" onPress={onChoosePhoto} />
          </View>
        )}
      </View>

      <TextInput
        label="Case Notes"
        placeholder="Symptoms, history, observations…"
        value={caseNotes}
        onChangeText={(text) => {
          setCaseNotes(text)
          setCaseError('')
        }}
        multiline
        textAlignVertical="top"
        style={styles.notes}
        errorText={caseError}
      />

      {formError ? <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text> : null}
      <Button mode="contained" onPress={onSavePressed} loading={loading}>
        Save Patient
      </Button>
    </Background>
  )
}

function PhotoAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
}) {
  const { colors } = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoAction,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={[styles.photoActionText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    width: '100%',
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 2,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius,
    paddingVertical: 20,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderRadius: radius,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    minHeight: 120,
  },
  formError: {
    width: '100%',
    fontSize: 13,
    textAlign: 'center',
  },
})
