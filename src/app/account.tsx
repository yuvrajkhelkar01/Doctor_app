import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { launchCameraAsync, launchImageLibraryAsync, useCameraPermissions, type ImagePickerAsset, type ImagePickerOptions } from 'expo-image-picker'
import { Redirect, Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import BookingLinkSheet from '@/components/booking-link-sheet'
import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import ChangeEmailSheet from '@/components/change-email-sheet'
import ChangePasswordSheet from '@/components/change-password-sheet'
import DeleteAccountSheet from '@/components/delete-account-sheet'
import OptionRow from '@/components/option-row'
import PhoneInput from '@/components/phone-input'
import TextInput from '@/components/text-input'
import TopBar from '@/components/top-bar'
import { countries, defaultCountry, type Country } from '@/constants/countries'
import { radius } from '@/constants/theme'
import { type DoctorProfile, useDoctorProfile } from '@/hooks/use-doctor-profile'
import { removeProfilePhoto, updateProfile, uploadProfilePhoto } from '@/lib/account'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { nameValidator, phoneValidator } from '@/utils/validators'

// Square crop for the round profile photo
const pickerOptions: ImagePickerOptions = { mediaTypes: 'images', quality: 0.7, allowsEditing: true, aspect: [1, 1] }

type Sheet = 'photo' | 'password' | 'email' | 'booking' | 'delete' | null

// Manage my account: profile photo and details, password, login email, and account deletion
export default function AccountScreen() {
  const { colors } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user.id
  const { profile, loading, error, reload } = useDoctorProfile(userId)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()

  const [firstName, setFirstName] = useState({ value: '', error: '' })
  const [lastName, setLastName] = useState({ value: '', error: '' })
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [phone, setPhone] = useState({ value: '', error: '' })
  const [specialization, setSpecialization] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null)

  // Fill the form from the profile once it has loaded
  const [filledFor, setFilledFor] = useState<string | null>(null)
  if (profile && profile.id !== filledFor) {
    const saved = splitPhone(profile.mobile_number)
    setFilledFor(profile.id)
    setFirstName({ value: profile.first_name, error: '' })
    setLastName({ value: profile.last_name, error: '' })
    setCountry(saved.country)
    setPhone({ value: saved.number, error: '' })
    setSpecialization(profile.specialization ?? '')
    setLicenseNumber(profile.license_number ?? '')
  }

  if (!authLoading && !session) return <Redirect href="/login" />

  const email = session?.user.email ?? profile?.email ?? ''
  const pendingEmail = session?.user.new_email
  const mobileNumber = phone.value ? `${country.dialCode}${phone.value}` : ''
  const changed =
    !!profile &&
    (firstName.value.trim() !== profile.first_name ||
      lastName.value.trim() !== profile.last_name ||
      mobileNumber !== (profile.mobile_number ?? '') ||
      specialization.trim() !== (profile.specialization ?? '') ||
      licenseNumber.trim() !== (profile.license_number ?? ''))

  const onSave = async () => {
    if (!userId) return
    const firstNameError = nameValidator(firstName.value, 'First name')
    const lastNameError = nameValidator(lastName.value, 'Last name')
    const phoneError = phoneValidator(phone.value, country.length)
    if (firstNameError || lastNameError || phoneError) {
      setFirstName({ ...firstName, error: firstNameError })
      setLastName({ ...lastName, error: lastNameError })
      setPhone({ ...phone, error: phoneError })
      return
    }
    setSaving(true)
    setNotice(null)
    const message = await updateProfile(userId, {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      mobileNumber,
      specialization: specialization.trim(),
      licenseNumber: licenseNumber.trim(),
    })
    setSaving(false)
    setNotice(message ? { text: message, isError: true } : { text: 'Profile saved.', isError: false })
    if (!message) reload()
  }

  const onPhotoPicked = async (photo: ImagePickerAsset) => {
    if (!userId) return
    setPhotoBusy(true)
    setNotice(null)
    const message = await uploadProfilePhoto(userId, photo)
    setPhotoBusy(false)
    if (message) setNotice({ text: message, isError: true })
    else reload()
  }

  const onTakePhoto = async () => {
    setSheet(null)
    await sheetClosed()
    // The browser asks for camera access itself
    if (Platform.OS !== 'web' && !cameraPermission?.granted) {
      const { granted } = await requestCameraPermission()
      if (!granted) {
        setNotice({ text: 'Camera access is off. Allow it in Settings, or choose a photo from your library.', isError: true })
        return
      }
    }
    const result = await launchCameraAsync(pickerOptions)
    if (!result.canceled) onPhotoPicked(result.assets[0])
  }

  const onChoosePhoto = async () => {
    setSheet(null)
    await sheetClosed()
    const result = await launchImageLibraryAsync(pickerOptions)
    if (!result.canceled) onPhotoPicked(result.assets[0])
  }

  const onRemovePhoto = async () => {
    if (!userId) return
    setSheet(null)
    setPhotoBusy(true)
    setNotice(null)
    const message = await removeProfilePhoto(userId)
    setPhotoBusy(false)
    if (message) setNotice({ text: message, isError: true })
    else reload()
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="Manage my account" fallbackHref="/dashboard" />

      {authLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !profile ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>{error || 'Profile not found.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            <Pressable
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
              disabled={photoBusy}
              onPress={() => setSheet('photo')}
              style={({ pressed }) => [styles.avatarButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Avatar profile={profile} busy={photoBusy} />
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              </View>
            </Pressable>
            <Text style={[styles.name, { color: colors.text }]}>
              Dr. {profile.first_name} {profile.last_name}
            </Text>
            <Text style={[styles.email, { color: colors.secondary }]}>{email}</Text>
          </View>

          {notice ? (
            <Pressable
              onPress={() => setNotice(null)}
              style={[styles.notice, { backgroundColor: notice.isError ? colors.surface : colors.surfaceRaised }]}
            >
              <Ionicons
                name={notice.isError ? 'alert-circle' : 'checkmark-circle'}
                size={20}
                color={notice.isError ? colors.error : colors.primary}
              />
              <Text style={[styles.noticeText, { color: notice.isError ? colors.error : colors.text }]}>{notice.text}</Text>
              <Ionicons name="close" size={18} color={colors.secondary} />
            </Pressable>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <TextInput
                label="First name"
                autoCapitalize="words"
                value={firstName.value}
                errorText={firstName.error}
                onChangeText={(value) => setFirstName({ value, error: '' })}
              />
            </View>
            <View style={styles.nameField}>
              <TextInput
                label="Last name"
                autoCapitalize="words"
                value={lastName.value}
                errorText={lastName.error}
                onChangeText={(value) => setLastName({ value, error: '' })}
              />
            </View>
          </View>
          <PhoneInput
            label="Phone number"
            country={country}
            onCountryChange={setCountry}
            value={phone.value}
            errorText={phone.error}
            onChangeText={(value) => setPhone({ value, error: '' })}
          />
          <TextInput
            label="Specialization"
            placeholder="e.g. Physiotherapist"
            autoCapitalize="words"
            value={specialization}
            onChangeText={setSpecialization}
          />
          <TextInput
            label="Registration / licence number"
            placeholder="Optional"
            autoCapitalize="characters"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
          />
          {changed ? (
            <Button icon="checkmark" loading={saving} onPress={onSave}>
              Save changes
            </Button>
          ) : null}

          <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.text }]}>Security</Text>
          <View style={styles.options}>
            <OptionRow
              icon="key-outline"
              title="Change password"
              description="Update the password you sign in with"
              onPress={() => setSheet('password')}
            />
            <OptionRow
              icon="mail-outline"
              title="Change email"
              description={
                pendingEmail ? `Waiting for confirmation: ${pendingEmail}` : 'Move your account and all its data to a new email'
              }
              onPress={() => setSheet('email')}
            />
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.text }]}>Booking form</Text>
          <OptionRow
            icon="link-outline"
            title="Booking form link"
            description="Let patients request appointments from your website"
            onPress={() => setSheet('booking')}
          />

          <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.text }]}>Account</Text>
          <OptionRow
            icon="trash-outline"
            title="Delete account"
            description="Permanently delete your account and all patient data"
            destructive
            onPress={() => setSheet('delete')}
          />
        </ScrollView>
      )}

      <BottomSheet visible={sheet === 'photo'} title="Profile photo" onClose={() => setSheet(null)}>
        <View style={styles.options}>
          <OptionRow icon="camera-outline" title="Take photo" description="Use the camera" onPress={onTakePhoto} />
          <OptionRow icon="images-outline" title="Choose from library" description="Pick an existing photo" onPress={onChoosePhoto} />
          {profile?.profile_photo_url ? (
            <OptionRow icon="trash-outline" title="Remove photo" description="Go back to the default icon" destructive onPress={onRemovePhoto} />
          ) : null}
        </View>
      </BottomSheet>
      <ChangePasswordSheet
        visible={sheet === 'password'}
        email={email}
        onClose={() => setSheet(null)}
        onChanged={() => setNotice({ text: 'Password updated.', isError: false })}
      />
      <BookingLinkSheet
        visible={sheet === 'booking'}
        token={profile?.booking_token ?? ''}
        onClose={() => setSheet(null)}
        onRegenerated={reload}
      />
      <ChangeEmailSheet visible={sheet === 'email'} currentEmail={email} onClose={() => setSheet(null)} />
      <DeleteAccountSheet visible={sheet === 'delete'} userId={userId ?? ''} email={email} onClose={() => setSheet(null)} />
    </SafeAreaView>
  )
}

function Avatar({ profile, busy }: { profile: DoctorProfile; busy: boolean }) {
  const { colors } = useTheme()

  return (
    <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
      {profile.profile_photo_url ? (
        <Image source={profile.profile_photo_url} style={styles.avatarImage} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.avatarText, { color: colors.primary }]}>{profile.first_name.charAt(0).toUpperCase()}</Text>
      )}
      {busy ? (
        <View style={styles.avatarBusy}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  )
}

// iOS can't present the photo picker while the sheet is still sliding away
function sheetClosed() {
  return new Promise((resolve) => setTimeout(resolve, Platform.OS === 'ios' ? 400 : 0))
}

// Splits a stored number like "+919876543210" into its country and national number
function splitPhone(value: string | null) {
  if (!value) return { country: defaultCountry, number: '' }
  const match = [...countries]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((candidate) => value.startsWith(candidate.dialCode))
  return match ? { country: match, number: value.slice(match.dialCode.length) } : { country: defaultCountry, number: value.replace(/\D/g, '') }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  identity: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButton: {
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '700',
  },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSpacing: {
    marginTop: 24,
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  options: {
    gap: 12,
  },
})
