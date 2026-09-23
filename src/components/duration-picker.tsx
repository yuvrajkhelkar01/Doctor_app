import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

const DURATIONS = [15, 30, 45, 60]

// Appointment length choices, in minutes
export default function DurationPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const { colors } = useTheme()

  return (
    <View style={styles.chips}>
      {DURATIONS.map((minutes) => {
        const selected = minutes === value
        return (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(minutes)}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>
              {minutes === 60 ? '1 hr' : `${minutes} min`}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
