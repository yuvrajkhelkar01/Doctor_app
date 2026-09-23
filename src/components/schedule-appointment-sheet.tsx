import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import DurationPicker from '@/components/duration-picker'
import { radius } from '@/constants/theme'
import { type PatientSummary, usePatientSearch } from '@/hooks/use-patient-search'
import { addAppointment } from '@/lib/appointments'
import { useTheme } from '@/providers/theme-provider'
import { formatTime } from '@/utils/dates'

type Props = {
  visible: boolean
  start: Date | null
  doctorId: string
  onClose: () => void
  onScheduled: () => void
}

// Bottom sheet for booking the calendar slot that was tapped: pick a patient, a length and optional notes
export default function ScheduleAppointmentSheet({ visible, start, doctorId, onClose, onScheduled }: Props) {
  const { colors } = useTheme()
  const [search, setSearch] = useState('')
  const [patient, setPatient] = useState<PatientSummary | null>(null)
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { patients, loading: searching, error: searchError } = usePatientSearch(patient ? '' : search)

  // Start fresh each time the sheet opens
  const [now, setNow] = useState(() => new Date())
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setNow(new Date())
      setSearch('')
      setPatient(null)
      setDuration(30)
      setNotes('')
      setError('')
    }
  }

  const inPast = !!start && start.getTime() < now.getTime()
  const end = start ? new Date(start.getTime() + duration * 60 * 1000) : null

  const close = () => {
    if (!saving) onClose()
  }

  const onSave = async () => {
    if (!start) return
    if (!patient) {
      setError('Choose a patient first.')
      return
    }
    setSaving(true)
    setError('')
    const message = await addAppointment({
      doctorId,
      patientId: patient.id,
      start,
      durationMinutes: duration,
      notes: notes.trim(),
    })
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    onScheduled()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>New appointment</Text>
              {start && end ? (
                <Text style={[styles.subtitle, { color: inPast ? colors.error : colors.secondary }]}>
                  {formatDay(start)} · {formatTime(start)} – {formatTime(end)}
                </Text>
              ) : null}
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={close}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          {inPast ? (
            <View style={styles.pastState}>
              <Ionicons name="time-outline" size={28} color={colors.muted} />
              <Text style={[styles.pastText, { color: colors.secondary }]}>
                This time has already passed. Pick a later slot to schedule an appointment.
              </Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text style={[styles.label, { color: colors.secondary }]}>Patient</Text>
              {patient ? (
                <View style={[styles.selectedPatient, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                  <PatientAvatar name={patient.first_name} />
                  <View style={styles.patientInfo}>
                    <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                      {fullName(patient)}
                    </Text>
                    {patient.mobile_number ? (
                      <Text style={[styles.patientPhone, { color: colors.secondary }]}>{patient.mobile_number}</Text>
                    ) : null}
                  </View>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPatient(null)}>
                    <Text style={[styles.change, { color: colors.link }]}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.secondary} />
                    <TextInput
                      accessibilityLabel="Search patients"
                      autoCapitalize="words"
                      autoCorrect={false}
                      onChangeText={setSearch}
                      placeholder="Search by name or phone"
                      placeholderTextColor={colors.muted}
                      style={[styles.searchInput, { color: colors.text }]}
                      value={search}
                    />
                  </View>
                  {search.trim() ? (
                    <View style={[styles.results, { borderColor: colors.border }]}>
                      {searching ? (
                        <ActivityIndicator color={colors.primary} style={styles.resultsState} />
                      ) : searchError ? (
                        <Text style={[styles.resultsState, { color: colors.error }]}>{searchError}</Text>
                      ) : patients.length === 0 ? (
                        <Text style={[styles.resultsState, { color: colors.secondary }]}>No patients match “{search.trim()}”.</Text>
                      ) : (
                        patients.map((result, index) => (
                          <Pressable
                            key={result.id}
                            accessibilityRole="button"
                            onPress={() => {
                              setPatient(result)
                              setError('')
                            }}
                            style={({ pressed }) => [
                              styles.resultRow,
                              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                              pressed && { backgroundColor: colors.surface },
                            ]}
                          >
                            <PatientAvatar name={result.first_name} />
                            <View style={styles.patientInfo}>
                              <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                                {fullName(result)}
                              </Text>
                              {result.mobile_number ? (
                                <Text style={[styles.patientPhone, { color: colors.secondary }]}>{result.mobile_number}</Text>
                              ) : null}
                            </View>
                          </Pressable>
                        ))
                      )}
                    </View>
                  ) : null}
                </>
              )}

              <Text style={[styles.label, styles.spaced, { color: colors.secondary }]}>Duration</Text>
              <DurationPicker value={duration} onChange={setDuration} />

              <Text style={[styles.label, styles.spaced, { color: colors.secondary }]}>Notes (optional)</Text>
              <TextInput
                accessibilityLabel="Notes"
                multiline
                onChangeText={setNotes}
                placeholder="Reason for visit, reminders…"
                placeholderTextColor={colors.muted}
                style={[styles.notes, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={notes}
              />

              {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

              <Button icon="calendar" loading={saving} onPress={onSave}>
                Schedule
              </Button>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function PatientAvatar({ name }: { name: string }) {
  const { colors } = useTheme()

  return (
    <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  )
}

function fullName(patient: PatientSummary) {
  return [patient.first_name, patient.last_name].filter(Boolean).join(' ')
}

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    maxHeight: '92%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  pastState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  pastText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  content: {
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  spaced: {
    marginTop: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  results: {
    borderWidth: 1,
    borderRadius: radius,
    marginTop: 8,
    overflow: 'hidden',
  },
  resultsState: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  patientPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  notes: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
})
