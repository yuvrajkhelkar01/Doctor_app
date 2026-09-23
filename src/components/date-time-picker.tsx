import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'
import { addMonths, monthCells, startOfDay, startOfMonth } from '@/utils/dates'

type Props = {
  value: Date
  onChange: (value: Date) => void
  // Which side of today can be picked: 'past' for recording visits, 'future' for booking
  allow: 'past' | 'future'
  // Reference time for "today"
  now: Date
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

// Month calendar plus a 12-hour time picker (hour, minute in 5-minute steps, AM/PM)
export default function DateTimePicker({ value, onChange, allow, now }: Props) {
  const { colors } = useTheme()
  const [month, setMonth] = useState(() => startOfMonth(value))

  const today = startOfDay(now)
  const selectedDay = startOfDay(value).getTime()
  const atCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()
  const hour = value.getHours() % 12 || 12
  const period = value.getHours() < 12 ? 'AM' : 'PM'

  const withTime = (hours: number, minutes: number) => {
    const next = new Date(value)
    next.setHours(hours, minutes, 0, 0)
    onChange(next)
  }
  const pickDay = (date: Date) => {
    const next = new Date(date)
    next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    onChange(next)
  }

  return (
    <>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.monthRow}>
          <MonthArrow
            direction="back"
            disabled={allow === 'future' && atCurrentMonth}
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <MonthArrow
            direction="forward"
            disabled={allow === 'past' && atCurrentMonth}
            onPress={() => setMonth(addMonths(month, 1))}
          />
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((weekday, index) => (
            <Text key={index} style={[styles.cell, styles.weekday, { color: colors.muted }]}>
              {weekday}
            </Text>
          ))}
          {monthCells(month).map((date, index) => {
            if (!date) return <View key={`pad-${index}`} style={styles.cell} />
            const time = date.getTime()
            const isSelected = time === selectedDay
            const isToday = time === today.getTime()
            const isDisabled = allow === 'past' ? time > today.getTime() : time < today.getTime()
            return (
              <View key={time} style={styles.cell}>
                <Pressable
                  accessibilityLabel={date.toDateString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                  disabled={isDisabled}
                  onPress={() => pickDay(date)}
                  style={[
                    styles.dayButton,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? colors.onPrimary : isDisabled ? colors.muted : colors.text },
                      isSelected && styles.bold,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              </View>
            )
          })}
        </View>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.timeHeader}>
          <Text style={[styles.panelLabel, { color: colors.secondary }]}>Time</Text>
          <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {(['AM', 'PM'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: period === option }}
                onPress={() => withTime((hour % 12) + (option === 'PM' ? 12 : 0), value.getMinutes())}
                style={[styles.segmentItem, period === option && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.segmentText, { color: period === option ? colors.onPrimary : colors.secondary }]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.chipsLabel, { color: colors.muted }]}>Hour</Text>
        <ChipGrid
          values={HOURS}
          selected={hour}
          onSelect={(next) => withTime((next % 12) + (period === 'PM' ? 12 : 0), value.getMinutes())}
          format={String}
        />
        <Text style={[styles.chipsLabel, { color: colors.muted }]}>Minute</Text>
        <ChipGrid
          values={MINUTES}
          selected={value.getMinutes()}
          onSelect={(next) => withTime(value.getHours(), next)}
          format={(minute) => `:${String(minute).padStart(2, '0')}`}
        />
      </View>
    </>
  )
}

function MonthArrow({ direction, disabled, onPress }: { direction: 'back' | 'forward'; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme()

  return (
    <Pressable
      accessibilityLabel={direction === 'back' ? 'Previous month' : 'Next month'}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={[styles.monthArrow, disabled && styles.disabled]}
    >
      <Ionicons name={direction === 'back' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.text} />
    </Pressable>
  )
}

function ChipGrid({
  values,
  selected,
  onSelect,
  format,
}: {
  values: number[]
  selected: number
  onSelect: (value: number) => void
  format: (value: number) => string
}) {
  const { colors } = useTheme()

  return (
    <View style={styles.chips}>
      {values.map((value) => {
        const isSelected = value === selected
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(value)}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: isSelected ? colors.onPrimary : colors.text }]}>{format(value)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  weekday: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 6,
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  bold: {
    fontWeight: '700',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  panelLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
  },
  segmentItem: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipsLabel: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexBasis: '14%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
