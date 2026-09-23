import Ionicons from '@expo/vector-icons/Ionicons'
import { Modal, StyleSheet, Text, View } from 'react-native'

import Button from '@/components/button'
import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'
import { formatDateTime, formatTime } from '@/utils/dates'

type Props = {
  visible: boolean
  name: string
  phone: string
  start: Date
  durationMinutes: number
  // The time the patient originally asked for, shown only when the doctor moved it
  movedFrom?: Date
  // Sentence about the appointments this time would run into, if any
  warning?: string
  busy: boolean
  error: string
  onConfirm: () => void
  onCancel: () => void
}

// Last look before a booking request becomes a real appointment: who it's for, when it lands,
// and anything already in that slot. Confirming here is what adds it to the schedule.
export default function ConfirmBookingDialog({
  visible,
  name,
  phone,
  start,
  durationMinutes,
  movedFrom,
  warning,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme()
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => !busy && onCancel()}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="calendar" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Add to schedule?</Text>
          <Text style={[styles.patient, { color: colors.secondary }]}>
            {name} · {phone}
          </Text>

          <View style={[styles.slot, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.slotTime, { color: colors.text }]}>{formatDateTime(start)}</Text>
            <Text style={[styles.slotRange, { color: colors.secondary }]}>
              until {formatTime(end)} · {durationMinutes} min
            </Text>
          </View>

          {movedFrom ? (
            <View style={styles.movedRow}>
              <Ionicons name="swap-horizontal" size={15} color={colors.secondary} />
              <Text style={[styles.moved, { color: colors.secondary }]}>Moved from {formatDateTime(movedFrom)}</Text>
            </View>
          ) : null}

          {warning ? (
            <View style={[styles.warning, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>{warning}</Text>
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Button icon="checkmark" loading={busy} onPress={onConfirm}>
              Accept and book
            </Button>
            <Button mode="outlined" onPress={() => !busy && onCancel()}>
              Not yet
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius + 6,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 12,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  patient: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  slot: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  slotTime: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  slotRange: {
    fontSize: 13,
    marginTop: 3,
  },
  movedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  moved: {
    fontSize: 13,
    flexShrink: 1,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderRadius: radius,
    padding: 10,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  buttons: {
    width: '100%',
    marginTop: 12,
  },
})
