import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import DateTimePicker from '@/components/date-time-picker'
import Logo from '@/components/logo'
import PhoneInput from '@/components/phone-input'
import TextField from '@/components/text-input'
import { defaultCountry, type Country } from '@/constants/countries'
import { radius } from '@/constants/theme'
import { getBookingFormDoctor, submitBookingRequest, type BookingFormDoctor } from '@/lib/booking'
import { useTheme } from '@/providers/theme-provider'
import { formatDateTime } from '@/utils/dates'
import { nameValidator, phoneValidator } from '@/utils/validators'

// Public appointment request form, opened from the link the doctor shares. No sign-in needed:
// it only writes a booking request, which the doctor then accepts or declines in the app.
export default function BookingFormScreen() {
  const { colors } = useTheme()
  const { token } = useLocalSearchParams<{ token: string }>()
  const [doctor, setDoctor] = useState<BookingFormDoctor | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState({ value: '', error: '' })
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [phone, setPhone] = useState({ value: '', error: '' })
  const [note, setNote] = useState('')
  const [now] = useState(() => new Date())
  // Default to the next day at 10 AM, a sensible clinic hour
  const [preferred, setPreferred] = useState(() => {
    const start = new Date(now)
    start.setDate(start.getDate() + 1)
    start.setHours(10, 0, 0, 0)
    return start
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getBookingFormDoctor(token).then((result) => {
      if (cancelled) return
      setDoctor(result.doctor)
      setLoadError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const inPast = preferred.getTime() < now.getTime()
  const doctorName = doctor ? `Dr. ${[doctor.firstName, doctor.lastName].filter(Boolean).join(' ')}` : ''

  const onSubmit = async () => {
    const nameError = nameValidator(name.value, 'Name')
    const phoneError = phoneValidator(phone.value, country.length)
    if (nameError || phoneError) {
      setName({ ...name, error: nameError })
      setPhone({ ...phone, error: phoneError })
      return
    }
    setSending(true)
    setError('')
    const message = await submitBookingRequest(
      token,
      name.value.trim(),
      `${country.dialCode}${phone.value}`,
      preferred,
      note.trim(),
    )
    setSending(false)
    if (message) {
      setError(message)
      return
    }
    setSent(true)
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false, title: 'Book an appointment' }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !doctor ? (
        <View style={styles.centered}>
          <Ionicons name={loadError ? 'cloud-offline-outline' : 'link-outline'} size={32} color={colors.muted} />
          <Text style={[styles.centeredTitle, { color: colors.text }]}>
            {loadError ? "Couldn't load this form" : "This link isn't valid"}
          </Text>
          <Text style={[styles.centeredText, { color: colors.secondary }]}>
            {loadError || 'It may have been replaced. Please ask the clinic for their current booking link.'}
          </Text>
        </View>
      ) : sent ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          <Text style={[styles.centeredTitle, { color: colors.text }]}>Request sent</Text>
          <Text style={[styles.centeredText, { color: colors.secondary }]}>
            {doctorName} has your request for {formatDateTime(preferred)}. The clinic will contact you on{' '}
            {country.dialCode}
            {phone.value} to confirm.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Logo />
            <Text style={[styles.title, { color: colors.text }]}>Book an appointment</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              with {doctorName}
              {doctor.specialization ? ` · ${doctor.specialization}` : ''}
            </Text>
          </View>

          <TextField
            label="Your name"
            autoCapitalize="words"
            value={name.value}
            errorText={name.error}
            onChangeText={(value) => setName({ value, error: '' })}
          />
          <PhoneInput
            label="Phone number"
            country={country}
            onCountryChange={setCountry}
            value={phone.value}
            errorText={phone.error}
            onChangeText={(value) => setPhone({ value, error: '' })}
          />

          <Text style={[styles.label, { color: colors.secondary }]}>Preferred date & time</Text>
          <View style={styles.picker}>
            <DateTimePicker value={preferred} onChange={setPreferred} allow="future" now={now} />
          </View>

          <Text style={[styles.label, { color: colors.secondary }]}>What would you like to be seen for?</Text>
          <TextInput
            accessibilityLabel="Reason for the appointment"
            multiline
            onChangeText={setNote}
            placeholder="Optional"
            placeholderTextColor={colors.muted}
            style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={note}
          />

          <View style={styles.summary}>
            <Ionicons name="time-outline" size={18} color={inPast ? colors.error : colors.primary} />
            <Text style={[styles.summaryText, { color: inPast ? colors.error : colors.text }]}>
              {inPast ? 'Please choose a time in the future' : formatDateTime(preferred)}
            </Text>
          </View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          {!inPast ? (
            <Button icon="calendar" loading={sending} onPress={onSubmit}>
              Request appointment
            </Button>
          ) : null}

          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            This is a request, not a confirmed booking. The clinic will contact you to confirm the time.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  )
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
    padding: 28,
  },
  centeredTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  centeredText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  picker: {
    gap: 14,
  },
  note: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
})
