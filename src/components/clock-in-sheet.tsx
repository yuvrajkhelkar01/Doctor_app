import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import DateTimePicker from '@/components/date-time-picker'
import OptionRow from '@/components/option-row'
import { useTheme } from '@/providers/theme-provider'
import { formatDateTime, roundDownToFiveMinutes } from '@/utils/dates'

type Props = {
  visible: boolean
  patientName: string
  onClose: () => void
  // Saves the visit; resolves to an error message, or '' on success
  onClockIn: (visitedAt: Date) => Promise<string>
}

// Bottom sheet for clocking a patient in: right now, or at a date and time picked by hand
export default function ClockInSheet({ visible, patientName, onClose, onClockIn }: Props) {
  const { colors } = useTheme()
  const [step, setStep] = useState<'choose' | 'manual'>('choose')
  const [saving, setSaving] = useState<'now' | 'manual' | null>(null)
  const [error, setError] = useState('')
  // The manually picked time, reset to the current time each time the picker opens
  const [selected, setSelected] = useState(() => new Date())

  // The time the sheet was opened; refreshed on every open
  const [now, setNow] = useState(() => new Date())
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) setNow(new Date())
  }

  const close = () => {
    if (saving) return
    setStep('choose')
    setError('')
    onClose()
  }

  const save = async (kind: 'now' | 'manual', visitedAt: Date) => {
    setSaving(kind)
    setError('')
    const message = await onClockIn(visitedAt)
    setSaving(null)
    if (message) {
      setError(message)
      return
    }
    setStep('choose')
    onClose()
  }

  const openManual = () => {
    const current = new Date()
    setNow(current)
    setSelected(roundDownToFiveMinutes(current))
    setError('')
    setStep('manual')
  }

  const inFuture = selected.getTime() > now.getTime()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}>
            {step === 'manual' ? (
              <Pressable
                accessibilityLabel="Back"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => {
                  setError('')
                  setStep('choose')
                }}
              >
                <Ionicons name="arrow-back" size={22} color={colors.secondary} />
              </Pressable>
            ) : null}
            <View style={styles.headerText}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {step === 'choose' ? 'Clock in' : 'Pick date & time'}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.secondary }]} numberOfLines={1}>
                {patientName}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={close}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          {step === 'choose' ? (
            <View style={styles.options}>
              <OptionRow
                icon="flash-outline"
                title="Clock in now"
                description={formatDateTime(now)}
                loading={saving === 'now'}
                disabled={!!saving}
                onPress={() => save('now', new Date())}
              />
              <OptionRow
                icon="calendar-outline"
                title="Pick date & time"
                description="Record a visit at an earlier time"
                disabled={!!saving}
                onPress={openManual}
              />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.manual}>
              <DateTimePicker value={selected} onChange={setSelected} allow="past" now={now} />

              <View style={styles.summary}>
                <Ionicons name="time-outline" size={18} color={inFuture ? colors.error : colors.primary} />
                <Text style={[styles.summaryText, { color: inFuture ? colors.error : colors.text }]}>
                  {inFuture ? "That time hasn't happened yet" : formatDateTime(selected)}
                </Text>
              </View>

              {!inFuture ? (
                <Button icon="checkmark" loading={saving === 'manual'} onPress={() => save('manual', selected)}>
                  Clock in
                </Button>
              ) : null}
            </ScrollView>
          )}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        </SafeAreaView>
      </View>
    </Modal>
  )
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  options: {
    gap: 12,
    paddingBottom: 12,
  },
  manual: {
    gap: 14,
    paddingBottom: 8,
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
  error: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 8,
  },
})
