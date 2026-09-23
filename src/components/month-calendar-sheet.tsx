import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { radius } from '@/constants/theme'
import { useMonthAppointmentCounts } from '@/hooks/use-month-appointment-counts'
import { useTheme } from '@/providers/theme-provider'
import { addMonths, monthCells, startOfDay, startOfMonth } from '@/utils/dates'

type Props = {
  visible: boolean
  // The day the day view is showing, as a local midnight timestamp
  selectedDay: number
  onClose: () => void
  onSelectDay: (day: number) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Month overview: every day with its number of appointments; tapping a day opens it in the day view
export default function MonthCalendarSheet({ visible, selectedDay, onClose, onSelectDay }: Props) {
  const { colors } = useTheme()
  const [month, setMonth] = useState(() => startOfMonth(new Date(selectedDay)).getTime())
  const [today, setToday] = useState(() => startOfDay(new Date()).getTime())
  const { counts, loading, error } = useMonthAppointmentCounts(month, visible)

  // Open on the month of the day being viewed
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setMonth(startOfMonth(new Date(selectedDay)).getTime())
      setToday(startOfDay(new Date()).getTime())
    }
  }

  const monthDate = new Date(month)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[styles.subtitle, { color: error ? colors.error : colors.secondary }]}>
                {error || (loading ? 'Loading…' : `${total} ${total === 1 ? 'appointment' : 'appointments'} this month`)}
              </Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => setMonth(addMonths(monthDate, -1).getTime())}
              style={styles.arrow}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => setMonth(addMonths(monthDate, 1).getTime())}
              style={styles.arrow}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.grid}>
              {WEEKDAYS.map((weekday, index) => (
                <Text key={index} style={[styles.cell, styles.weekday, { color: colors.muted }]}>
                  {weekday}
                </Text>
              ))}
              {monthCells(monthDate).map((date, index) => {
                if (!date) return <View key={`pad-${index}`} style={styles.cell} />
                const day = date.getTime()
                const count = counts[day] ?? 0
                const isSelected = day === selectedDay
                const isToday = day === today
                return (
                  <View key={day} style={styles.cell}>
                    <Pressable
                      accessibilityLabel={`${date.toDateString()}, ${count} ${count === 1 ? 'appointment' : 'appointments'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        onSelectDay(day)
                        onClose()
                      }}
                      style={({ pressed }) => [
                        styles.day,
                        isSelected && { backgroundColor: colors.primary },
                        !isSelected && isToday && { borderWidth: 1, borderColor: colors.primary },
                        pressed && !isSelected && { backgroundColor: colors.surfaceRaised },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isSelected ? colors.onPrimary : isToday ? colors.primary : colors.text },
                          (isSelected || isToday) && styles.bold,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {count > 0 ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: isSelected ? colors.onPrimary : colors.primary },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: isSelected ? colors.primary : colors.onPrimary }]}>
                            {count}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.badgeSpace} />
                      )}
                    </Pressable>
                  </View>
                )
              })}
            </View>
          </View>

          <Text style={[styles.hint, { color: colors.muted }]}>Tap a day to open it</Text>
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
    gap: 8,
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
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius,
    padding: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  weekday: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 6,
  },
  day: {
    width: 44,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayText: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  bold: {
    fontWeight: '700',
  },
  badge: {
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  badgeSpace: {
    height: 16,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
})
