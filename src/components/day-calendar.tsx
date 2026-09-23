import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import AppointmentActionsSheet from '@/components/appointment-actions-sheet'
import BookingRequestsSheet from '@/components/booking-requests-sheet'
import MonthCalendarSheet from '@/components/month-calendar-sheet'
import ScheduleAppointmentSheet from '@/components/schedule-appointment-sheet'
import { radius } from '@/constants/theme'
import { useBookingRequests } from '@/hooks/use-booking-requests'
import { type DayAppointment, useDayAppointments } from '@/hooks/use-day-appointments'
import { useTheme } from '@/providers/theme-provider'
import { formatTime, startOfDay } from '@/utils/dates'

const SLOT_MINUTES = 30
const SLOT_HEIGHT = 36
const HOUR_HEIGHT = SLOT_HEIGHT * (60 / SLOT_MINUTES)
const SLOTS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, index) => index)
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const GUTTER = 56
// Room above midnight so the "12 AM" label isn't clipped
const TOP_PADDING = 8

// Teams-style day view: scroll through the day's half-hour slots, tap an empty one to schedule
export default function DayCalendar({ doctorId }: { doctorId: string }) {
  const { colors } = useTheme()
  const [now, setNow] = useState(() => new Date())
  const [day, setDay] = useState(() => startOfDay(new Date()).getTime())
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [monthOpen, setMonthOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const { requests, reload: reloadRequests } = useBookingRequests(!!doctorId)
  const [openAppointment, setOpenAppointment] = useState<DayAppointment | null>(null)
  const { appointments, loading, error, reload } = useDayAppointments(day)
  const scrollRef = useRef<ScrollView>(null)

  // Keep the current-time line moving
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: startOffset(day), animated: false })
  }, [day])

  const date = new Date(day)
  const isToday = day === startOfDay(now).getTime()
  const nowOffset = TOP_PADDING + ((now.getHours() * 60 + now.getMinutes()) / SLOT_MINUTES) * SLOT_HEIGHT
  const layout = layoutAppointments(appointments)

  const changeDay = (days: number) => {
    setSelectedSlot(null)
    setDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime())
  }

  const slotStart = (slot: number) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, slot * SLOT_MINUTES)

  return (
    <View>
      {requests.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setRequestsOpen(true)}
          style={({ pressed }) => [
            styles.requestsBanner,
            { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="mail-unread-outline" size={20} color={colors.primary} />
          <View style={styles.requestsText}>
            <Text style={[styles.requestsTitle, { color: colors.text }]}>
              {requests.length} appointment {requests.length === 1 ? 'request' : 'requests'}
            </Text>
            <Text style={[styles.requestsSubtitle, { color: colors.secondary }]} numberOfLines={1}>
              From your booking form · tap to review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderTopColor: colors.primary, borderBottomColor: colors.border }]}>
        <View style={styles.headerDate}>
          <Text style={[styles.dayNumber, { color: isToday ? colors.primary : colors.text }]}>{date.getDate()}</Text>
          <View style={styles.headerLabels}>
            <Text numberOfLines={1} style={[styles.weekday, { color: isToday ? colors.primary : colors.text }]}>
              {date.toLocaleDateString(undefined, { weekday: 'long' })}
            </Text>
            <Text numberOfLines={1} style={[styles.monthYear, { color: colors.secondary }]}>
              {date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {!isToday ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSelectedSlot(null)
              setDay(startOfDay(new Date()).getTime())
            }}
            style={({ pressed }) => [styles.todayButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.todayText, { color: colors.text }]}>Today</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Month view"
          accessibilityRole="button"
          onPress={() => setMonthOpen(true)}
          style={({ pressed }) => [styles.monthButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={[styles.todayText, { color: colors.text }]}>Month</Text>
        </Pressable>
        <Pressable accessibilityLabel="Previous day" accessibilityRole="button" hitSlop={6} onPress={() => changeDay(-1)} style={styles.arrow}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Next day" accessibilityRole="button" hitSlop={6} onPress={() => changeDay(1)} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        // On web the first scroll can land before the grid is laid out, so repeat it once the size is known
        onContentSizeChange={() => scrollRef.current?.scrollTo({ y: startOffset(day), animated: false })}
        showsVerticalScrollIndicator={false}
        style={styles.scroller}
      >
        <View style={styles.body}>
          <View style={styles.gutter}>
            {HOURS.map((hour) =>
              hour === 0 ? null : (
                <Text key={hour} style={[styles.hourLabel, { top: TOP_PADDING + hour * HOUR_HEIGHT - 7, color: colors.muted }]}>
                  {formatHour(hour)}
                </Text>
              ),
            )}
          </View>

          <View style={[styles.column, { borderLeftColor: colors.border }]}>
            {SLOTS.map((slot) => {
              const onHour = slot % (60 / SLOT_MINUTES) === 0
              return (
                <Pressable
                  key={slot}
                  accessibilityLabel={`Schedule at ${formatTime(slotStart(slot))}`}
                  accessibilityRole="button"
                  onPress={() => setSelectedSlot(slot)}
                  style={({ pressed }) => [
                    styles.slot,
                    {
                      top: TOP_PADDING + slot * SLOT_HEIGHT,
                      borderTopColor: colors.border,
                      // Half-hour lines are fainter than hour lines
                      opacity: onHour ? 1 : 0.45,
                    },
                    pressed && { backgroundColor: colors.surfaceRaised },
                  ]}
                />
              )
            })}

            {selectedSlot !== null ? (
              <View
                pointerEvents="none"
                style={[styles.selectedSlot, { top: TOP_PADDING + selectedSlot * SLOT_HEIGHT, borderColor: colors.text }]}
              />
            ) : null}

            {appointments.map((appointment) => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                {...layout[appointment.id]}
                onPress={() => setOpenAppointment(appointment)}
              />
            ))}

            {isToday ? (
              <View pointerEvents="none" style={[styles.nowLine, { top: nowOffset, backgroundColor: colors.error }]}>
                <View style={[styles.nowDot, { backgroundColor: colors.error }]} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ScheduleAppointmentSheet
        visible={selectedSlot !== null}
        start={selectedSlot !== null ? slotStart(selectedSlot) : null}
        doctorId={doctorId}
        onClose={() => setSelectedSlot(null)}
        onScheduled={reload}
      />

      <AppointmentActionsSheet
        appointment={openAppointment}
        onClose={() => setOpenAppointment(null)}
        onChanged={reload}
      />

      <MonthCalendarSheet
        visible={monthOpen}
        selectedDay={day}
        onClose={() => setMonthOpen(false)}
        onSelectDay={(selected) => {
          setSelectedSlot(null)
          setDay(selected)
        }}
      />

      <BookingRequestsSheet
        visible={requestsOpen}
        requests={requests}
        doctorId={doctorId}
        onClose={() => setRequestsOpen(false)}
        onHandled={() => {
          reloadRequests()
          reload()
        }}
      />
      </View>
    </View>
  )
}

function AppointmentBlock({
  appointment,
  lane,
  lanes,
  onPress,
}: {
  appointment: DayAppointment
  lane: number
  lanes: number
  onPress: () => void
}) {
  const { colors } = useTheme()
  const start = new Date(appointment.appointment_date)
  const end = new Date(start.getTime() + appointment.duration_minutes * 60 * 1000)
  const top = TOP_PADDING + ((start.getHours() * 60 + start.getMinutes()) / SLOT_MINUTES) * SLOT_HEIGHT
  const height = Math.max((appointment.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT - 2, 20)
  const name = appointment.patients
    ? [appointment.patients.first_name, appointment.patients.last_name].filter(Boolean).join(' ')
    : 'Patient'

  return (
    <Pressable
      accessibilityLabel={`${name}, ${formatTime(start)} to ${formatTime(end)}. Show options`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          top: top + 1,
          height,
          left: `${(lane / lanes) * 100}%`,
          width: `${100 / lanes}%`,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.blockInner, { backgroundColor: colors.surfaceRaised, borderLeftColor: colors.primary }]}>
        <Text style={[styles.blockTitle, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {height >= 34 ? (
          <Text style={[styles.blockTime, { color: colors.secondary }]} numberOfLines={1}>
            {formatTime(start)} – {formatTime(end)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

// Places overlapping appointments side by side: each gets a lane, and every appointment in a
// group of overlapping ones shares that group's lane count
function layoutAppointments(appointments: DayAppointment[]) {
  const positions: Record<string, { lane: number; lanes: number }> = {}
  const sorted = [...appointments].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
  let group: string[] = []
  let laneEnds: number[] = []
  let groupEnd = 0

  const closeGroup = () => {
    for (const id of group) positions[id].lanes = laneEnds.length
    group = []
    laneEnds = []
  }

  for (const appointment of sorted) {
    const start = new Date(appointment.appointment_date).getTime()
    const end = start + appointment.duration_minutes * 60 * 1000
    if (start >= groupEnd) closeGroup()

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    positions[appointment.id] = { lane, lanes: 1 }
    group.push(appointment.id)
    groupEnd = Math.max(groupEnd, end)
  }
  closeGroup()

  return positions
}

// Where the day view opens: today at the current time, other days at 8 AM
function startOffset(day: number) {
  const now = new Date()
  const hour = day === startOfDay(now).getTime() ? Math.max(now.getHours() - 1, 0) : 8
  return hour * HOUR_HEIGHT
}

function formatHour(hour: number) {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}

const styles = StyleSheet.create({
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  requestsText: {
    flex: 1,
  },
  requestsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  requestsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 3,
    borderBottomWidth: 1,
  },
  headerDate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLabels: {
    flexShrink: 1,
  },
  dayNumber: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weekday: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthYear: {
    fontSize: 12,
    marginTop: 1,
  },
  todayButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  todayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  arrow: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 8,
  },
  scroller: {
    height: 480,
  },
  body: {
    flexDirection: 'row',
    height: TOP_PADDING + 24 * HOUR_HEIGHT + 8,
  },
  gutter: {
    width: GUTTER,
  },
  hourLabel: {
    position: 'absolute',
    right: 8,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  column: {
    flex: 1,
    borderLeftWidth: 1,
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SLOT_HEIGHT,
    borderTopWidth: 1,
  },
  selectedSlot: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: SLOT_HEIGHT,
    borderWidth: 2,
    borderRadius: 4,
  },
  block: {
    position: 'absolute',
    paddingHorizontal: 2,
  },
  blockInner: {
    flex: 1,
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  blockTime: {
    fontSize: 11,
    marginTop: 1,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 2,
  },
  nowDot: {
    position: 'absolute',
    left: -5,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
