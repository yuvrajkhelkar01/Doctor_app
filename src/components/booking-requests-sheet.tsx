import Ionicons from '@expo/vector-icons/Ionicons'
import { openURL } from 'expo-linking'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import ConfirmBookingDialog from '@/components/confirm-booking-dialog'
import DateTimePicker from '@/components/date-time-picker'
import DurationPicker from '@/components/duration-picker'
import { radius } from '@/constants/theme'
import { useBookedSlots } from '@/hooks/use-booked-slots'
import { clashingSlots, slotPatientName, type BookedSlot } from '@/lib/appointments'
import { acceptBookingRequest, declineBookingRequest, type BookingRequest } from '@/lib/booking'
import { useTheme } from '@/providers/theme-provider'
import { endOfDay, formatDateTime, formatTime, roundDownToFiveMinutes, startOfDay } from '@/utils/dates'

// What a request is assumed to take until the doctor picks a length on the reschedule screen
const DEFAULT_DURATION = 30

// The booking waiting in the pop-up for a yes or no
type Pending = {
  request: BookingRequest
  start: Date
  duration: number
  // Set when the doctor moved the request off the time it asked for
  movedFrom?: Date
}

type Props = {
  visible: boolean
  requests: BookingRequest[]
  doctorId: string
  onClose: () => void
  // Called after accepting or declining, so the calendar and the list refresh
  onHandled: () => void
}

// The appointment requests that came in through the booking form. Accept takes the time the
// patient asked for and Reschedule picks a different one; either way the booking is confirmed in
// a pop-up before it lands on the calendar (creating the patient if they're new). Or decline it.
export default function BookingRequestsSheet({ visible, requests, doctorId, onClose, onHandled }: Props) {
  const { colors } = useTheme()
  const [rescheduling, setRescheduling] = useState<BookingRequest | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [start, setStart] = useState(() => new Date())
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [now, setNow] = useState(() => new Date())
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  // Every day a request (or a time being picked or confirmed for one) falls on, so clashes show up
  const range = useMemo(() => {
    const times = requests.map((request) => new Date(request.preferred_at).getTime())
    if (rescheduling) times.push(start.getTime())
    if (pending) times.push(pending.start.getTime())
    if (!visible || !times.length) return { from: null, to: null }
    return {
      from: startOfDay(new Date(Math.min(...times))).getTime(),
      to: endOfDay(new Date(Math.max(...times))).getTime(),
    }
  }, [visible, requests, rescheduling, start, pending])
  const { slots, reload: reloadSlots } = useBookedSlots(range.from, range.to)

  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setRescheduling(null)
      setPending(null)
      setError('')
      setNow(new Date())
    }
  }

  const openReschedule = (request: BookingRequest, current = new Date()) => {
    const preferred = new Date(request.preferred_at)
    setNow(current)
    // Start from the time they asked for, unless it has already passed
    setStart(preferred > current ? preferred : new Date(roundDownToFiveMinutes(current).getTime() + 5 * 60 * 1000))
    setDuration(DEFAULT_DURATION)
    setError('')
    setPending(null)
    setRescheduling(request)
  }

  // Accept takes the request exactly as it came in — unless that time has gone, which only a new
  // one fixes, so it falls through to the reschedule screen
  const onAccept = (request: BookingRequest) => {
    const current = new Date()
    const preferred = new Date(request.preferred_at)
    if (preferred <= current) {
      openReschedule(request, current)
      return
    }
    setNow(current)
    setError('')
    setPending({ request, start: preferred, duration: DEFAULT_DURATION })
  }

  // Hands the rescheduled time to the same pop-up Accept goes through
  const onReview = () => {
    if (!rescheduling) return
    const preferred = new Date(rescheduling.preferred_at)
    setError('')
    setPending({
      request: rescheduling,
      start,
      duration,
      movedFrom: start.getTime() === preferred.getTime() ? undefined : preferred,
    })
  }

  const onConfirm = async () => {
    if (!pending) return
    setBusyId(pending.request.id)
    setError('')
    const message = await acceptBookingRequest(pending.request, doctorId, pending.start, pending.duration)
    setBusyId('')
    if (message) {
      setError(message)
      return
    }
    onHandled()
    reloadSlots()
    setPending(null)
    setRescheduling(null)
    if (requests.length <= 1) onClose()
  }

  const onDecline = async (request: BookingRequest) => {
    setBusyId(request.id)
    setError('')
    const message = await declineBookingRequest(request.id)
    setBusyId('')
    if (message) {
      setError(message)
      return
    }
    onHandled()
    if (requests.length <= 1) onClose()
  }

  const startInPast = start.getTime() < now.getTime()
  const startClashes = rescheduling ? clashingSlots(slots, start, duration) : []
  const pendingClashes = pending ? clashingSlots(slots, pending.start, pending.duration) : []
  const overlapping = requests.filter(
    (request) => clashingSlots(slots, new Date(request.preferred_at), DEFAULT_DURATION).length,
  ).length

  return (
    <BottomSheet
      visible={visible}
      title={rescheduling ? 'Reschedule request' : 'Appointment requests'}
      subtitle={
        rescheduling
          ? `${rescheduling.full_name} · ${rescheduling.mobile_number}`
          : `${requests.length} ${requests.length === 1 ? 'request' : 'requests'} from your booking form${
              overlapping ? ` · ${overlapping} overlapping` : ''
            }`
      }
      onClose={() => !busyId && onClose()}
    >
      {rescheduling ? (
        <View style={styles.reschedule}>
          <View style={[styles.asked, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[styles.askedText, { color: colors.secondary }]}>
              Asked for {formatDateTime(new Date(rescheduling.preferred_at))}
            </Text>
          </View>

          <DateTimePicker value={start} onChange={setStart} allow="future" now={now} />

          <View>
            <Text style={[styles.label, { color: colors.secondary }]}>Duration</Text>
            <DurationPicker value={duration} onChange={setDuration} />
          </View>

          <View style={styles.summary}>
            <Ionicons name="calendar-outline" size={18} color={startInPast ? colors.error : colors.primary} />
            <Text style={[styles.summaryText, { color: startInPast ? colors.error : colors.text }]}>
              {startInPast
                ? 'That time has already passed'
                : `${formatDateTime(start)} – ${formatTime(new Date(start.getTime() + duration * 60 * 1000))}`}
            </Text>
          </View>

          {startClashes.length ? (
            <View style={[styles.clashBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
              <Ionicons name="alert-circle" size={18} color={colors.warning} />
              <Text style={[styles.clashText, { color: colors.warning }]}>
                {clashLabel(startClashes)}. You can still book it.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          {!startInPast ? (
            <Button icon="arrow-forward" onPress={onReview}>
              Review new time
            </Button>
          ) : null}
          <Button mode="outlined" onPress={() => setRescheduling(null)}>
            Back to requests
          </Button>
        </View>
      ) : (
        <View style={styles.list}>
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          {requests.map((request) => {
            const clashes = clashingSlots(slots, new Date(request.preferred_at), DEFAULT_DURATION)
            return (
              <View
                key={request.id}
                style={[
                  styles.card,
                  clashes.length
                    ? { backgroundColor: colors.warningSurface, borderColor: colors.warning, borderWidth: 2 }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {request.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {request.full_name}
                    </Text>
                    <Text style={[styles.phone, { color: colors.secondary }]}>{request.mobile_number}</Text>
                  </View>
                </View>

                <View style={styles.detail}>
                  <Ionicons name="time-outline" size={16} color={clashes.length ? colors.warning : colors.primary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {formatDateTime(new Date(request.preferred_at))}
                  </Text>
                </View>
                {clashes.length ? (
                  <View style={styles.detail}>
                    <Ionicons name="alert-circle" size={16} color={colors.warning} />
                    <Text style={[styles.detailText, styles.clashText, { color: colors.warning }]}>
                      {clashLabel(clashes)}
                    </Text>
                  </View>
                ) : null}
                {request.note ? (
                  <View style={styles.detail}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    <Text style={[styles.detailText, { color: colors.secondary }]}>{request.note}</Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!!busyId}
                    onPress={() => onAccept(request)}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                    <Text style={[styles.actionText, { color: colors.onPrimary }]}>Accept</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Reschedule ${request.full_name}`}
                    accessibilityRole="button"
                    disabled={!!busyId}
                    onPress={() => openReschedule(request)}
                    style={({ pressed }) => [
                      styles.action,
                      { borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Reschedule</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Call ${request.full_name}`}
                    accessibilityRole="button"
                    onPress={() => openURL(`tel:${request.mobile_number}`)}
                    style={({ pressed }) => [
                      styles.action,
                      { borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="call" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Call</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!!busyId}
                    onPress={() => onDecline(request)}
                    style={({ pressed }) => [
                      styles.action,
                      { borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    {busyId === request.id ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons name="close" size={16} color={colors.error} />
                    )}
                    <Text style={[styles.actionText, { color: colors.error }]}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
      )}

      <ConfirmBookingDialog
        visible={!!pending}
        name={pending?.request.full_name ?? ''}
        phone={pending?.request.mobile_number ?? ''}
        start={pending?.start ?? now}
        durationMinutes={pending?.duration ?? DEFAULT_DURATION}
        movedFrom={pending?.movedFrom}
        warning={pendingClashes.length ? clashLabel(pendingClashes) : undefined}
        busy={!!busyId}
        error={error}
        onConfirm={onConfirm}
        onCancel={() => {
          setPending(null)
          setError('')
        }}
      />
    </BottomSheet>
  )
}

// "Overlaps Ravi Kumar · 10:00 AM – 10:30 AM", plus a count when more than one is in the way
function clashLabel(clashes: BookedSlot[]) {
  const [first] = clashes
  const start = new Date(first.appointment_date)
  const end = new Date(start.getTime() + first.duration_minutes * 60 * 1000)
  const rest = clashes.length - 1
  const more = rest ? ` and ${rest} more` : ''
  return `Overlaps ${slotPatientName(first)} · ${formatTime(start)} – ${formatTime(end)}${more}`
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHeaderText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  phone: {
    fontSize: 13,
    marginTop: 2,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  action: {
    // Two per row, so four actions fit without squeezing the labels
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reschedule: {
    gap: 14,
    paddingTop: 8,
  },
  asked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
  },
  askedText: {
    flex: 1,
    fontSize: 14,
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
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
  clashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius,
    padding: 12,
  },
  clashText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
})
