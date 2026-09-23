import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import DateTimePicker from '@/components/date-time-picker'
import DurationPicker from '@/components/duration-picker'
import OptionRow from '@/components/option-row'
import { radius } from '@/constants/theme'
import type { DayAppointment } from '@/hooks/use-day-appointments'
import { deleteAppointment, rescheduleAppointment } from '@/lib/appointments'
import { useTheme } from '@/providers/theme-provider'
import { formatTime, roundDownToFiveMinutes } from '@/utils/dates'

type Props = {
  // The tapped appointment; null keeps the sheet closed
  appointment: DayAppointment | null
  onClose: () => void
  // Called after the appointment was moved or deleted, so the calendar can refresh
  onChanged: () => void
}

type Step = 'menu' | 'reschedule' | 'delete'

// Options for an appointment on the calendar: reschedule it, open the patient's profile, or delete it
export default function AppointmentActionsSheet({ appointment, onClose, onChanged }: Props) {
  const { colors } = useTheme()
  const [step, setStep] = useState<Step>('menu')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [newStart, setNewStart] = useState(() => new Date())
  const [newDuration, setNewDuration] = useState(30)

  // Keep showing the last appointment while the sheet slides away, and start over for each new one
  const [shown, setShown] = useState(appointment)
  const [wasOpen, setWasOpen] = useState(false)
  if (!!appointment !== wasOpen) setWasOpen(!!appointment)
  if (appointment && (appointment !== shown || !wasOpen)) {
    const current = new Date()
    const start = new Date(appointment.appointment_date)
    setShown(appointment)
    setStep('menu')
    setError('')
    setNow(current)
    // Offer the current slot if it's still ahead, otherwise the next 5-minute mark from now
    setNewStart(start > current ? start : new Date(roundDownToFiveMinutes(current).getTime() + 5 * 60 * 1000))
    setNewDuration(appointment.duration_minutes)
  }

  if (!shown) return null

  const name = shown.patients ? [shown.patients.first_name, shown.patients.last_name].filter(Boolean).join(' ') : 'Patient'
  const start = new Date(shown.appointment_date)
  const end = new Date(start.getTime() + shown.duration_minutes * 60 * 1000)
  const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000)
  const newInPast = newStart.getTime() < now.getTime()

  const close = () => {
    if (!saving) onClose()
  }

  const run = async (action: () => Promise<string>) => {
    setSaving(true)
    setError('')
    const message = await action()
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    onChanged()
    onClose()
  }

  const goTo = (next: Step) => {
    setError('')
    setStep(next)
  }

  return (
    <Modal visible={!!appointment} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            {step !== 'menu' ? (
              <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={12} disabled={saving} onPress={() => goTo('menu')}>
                <Ionicons name="arrow-back" size={22} color={colors.secondary} />
              </Pressable>
            ) : null}
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {step === 'reschedule' ? 'Reschedule' : step === 'delete' ? 'Delete appointment' : name}
              </Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={1}>
                {step === 'menu' ? '' : `${name} · `}
                {formatDay(start)} · {formatTime(start)} – {formatTime(end)}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={close}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          {step === 'menu' ? (
            <View style={styles.options}>
              <OptionRow
                icon="calendar-outline"
                title="Reschedule appointment"
                description="Move it to another date or time"
                onPress={() => goTo('reschedule')}
              />
              <OptionRow
                icon="person-outline"
                title="View profile"
                description={`Open ${name}'s patient page`}
                onPress={() => {
                  onClose()
                  router.push({ pathname: '/patients/[id]', params: { id: shown.patient_id } })
                }}
              />
              <OptionRow
                icon="trash-outline"
                title="Delete appointment"
                description="Remove it from the calendar"
                destructive
                onPress={() => goTo('delete')}
              />
            </View>
          ) : step === 'reschedule' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reschedule}>
              <DateTimePicker value={newStart} onChange={setNewStart} allow="future" now={now} />

              <View>
                <Text style={[styles.label, { color: colors.secondary }]}>Duration</Text>
                <DurationPicker value={newDuration} onChange={setNewDuration} />
              </View>

              <View style={styles.summary}>
                <Ionicons name="time-outline" size={18} color={newInPast ? colors.error : colors.primary} />
                <Text style={[styles.summaryText, { color: newInPast ? colors.error : colors.text }]}>
                  {newInPast
                    ? 'That time has already passed'
                    : `${formatDay(newStart)} · ${formatTime(newStart)} – ${formatTime(newEnd)}`}
                </Text>
              </View>

              {!newInPast ? (
                <Button
                  icon="checkmark"
                  loading={saving}
                  onPress={() => run(() => rescheduleAppointment(shown.id, newStart, newDuration))}
                >
                  Save new time
                </Button>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.confirm}>
              <View style={[styles.warning, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="warning-outline" size={22} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.text }]}>
                  This removes {name}&apos;s appointment from the calendar. It can&apos;t be undone.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: saving, disabled: saving }}
                disabled={saving}
                onPress={() => run(() => deleteAppointment(shown.id))}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error, opacity: pressed || saving ? 0.8 : 1 }]}
              >
                {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Ionicons name="trash" size={18} color={colors.onPrimary} />}
                <Text style={[styles.deleteText, { color: colors.onPrimary }]}>Delete appointment</Text>
              </Pressable>
              <Button mode="outlined" onPress={() => goTo('menu')}>
                Keep it
              </Button>
            </View>
          )}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </SafeAreaView>
      </View>
    </Modal>
  )
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
  options: {
    gap: 12,
    paddingBottom: 12,
  },
  reschedule: {
    gap: 14,
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirm: {
    paddingBottom: 4,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginBottom: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
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
  error: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 8,
  },
})
