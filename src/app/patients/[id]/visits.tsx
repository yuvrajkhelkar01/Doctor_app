import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import TopBar from '@/components/top-bar'
import { radius } from '@/constants/theme'
import { usePatientVisits } from '@/hooks/use-patient-visits'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'

export default function VisitHistoryScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, loading: authLoading } = useAuth()
  const { visits, loading, error } = usePatientVisits(session ? id : undefined)

  if (!authLoading && !session) return <Redirect href="/login" />

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="Visit history" fallbackHref={{ pathname: '/patients/[id]', params: { id } }} />

      {authLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error || visits.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-clear-outline" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>{error || 'No visits recorded yet.'}</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={[styles.count, { color: colors.secondary }]}>
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
          </Text>
          <View style={[styles.table, { borderColor: colors.border }]}>
            <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.indexCell, styles.headerText, { color: colors.secondary }]}>#</Text>
              <Text style={[styles.cell, styles.headerText, { color: colors.secondary }]}>Date</Text>
              <Text style={[styles.timeCell, styles.headerText, { color: colors.secondary }]}>Time</Text>
            </View>
            <FlatList
              data={visits}
              keyExtractor={(visit) => visit.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.row,
                    { borderTopColor: colors.border },
                    index % 2 === 1 && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.indexCell, { color: colors.muted }]}>{visits.length - index}</Text>
                  <Text style={[styles.cell, styles.bodyText, { color: colors.text }]}>
                    {formatDate(item.visited_at)}
                  </Text>
                  <Text style={[styles.timeCell, styles.bodyText, { color: colors.text }]}>
                    {formatTime(item.visited_at)}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Always 12-hour, e.g. "4:30 PM"
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  count: {
    fontSize: 13,
    marginBottom: 10,
  },
  table: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: radius,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  headerRow: {
    borderTopWidth: 0,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  indexCell: {
    width: 24,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  cell: {
    flex: 1,
  },
  timeCell: {
    width: 84,
    textAlign: 'right',
  },
})
