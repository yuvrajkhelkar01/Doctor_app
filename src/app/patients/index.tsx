import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, router, Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import PatientActionsSheet from '@/components/patient-actions-sheet'
import TopBar from '@/components/top-bar'
import { radius } from '@/constants/theme'
import { type PatientOverview, usePatientOverview } from '@/hooks/use-patient-overview'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { startOfDay } from '@/utils/dates'

// All of the doctor's patients as a table: name, phone number, number of visits and last visit
export default function PatientsScreen() {
  const { colors } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const { patients, loading, error, reload } = usePatientOverview(!!session)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PatientOverview | null>(null)

  if (!authLoading && !session) return <Redirect href="/login" />

  const term = search.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  const filtered = term
    ? patients.filter(
        (patient) =>
          fullName(patient).toLowerCase().includes(term) ||
          (digits.length >= 3 && (patient.mobile_number ?? '').includes(digits)),
      )
    : patients

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="Patients" fallbackHref="/dashboard" />

      {authLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>{error}</Text>
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>No patients yet.</Text>
          <View style={styles.emptyButton}>
            <Button icon="person-add-outline" onPress={() => router.push('/add-patient')}>
              Add patient
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.secondary} />
            <TextInput
              accessibilityLabel="Filter patients"
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Filter by name or phone"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
            />
            {search ? (
              <Pressable accessibilityLabel="Clear filter" hitSlop={8} onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.count, { color: colors.secondary }]}>
            {term ? `${filtered.length} of ${patients.length}` : patients.length}{' '}
            {patients.length === 1 && !term ? 'patient' : 'patients'}
          </Text>

          <View style={[styles.table, { borderColor: colors.border }]}>
            <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.nameCell, styles.headerText, { color: colors.secondary }]}>Patient name</Text>
              <Text style={[styles.phoneCell, styles.headerText, { color: colors.secondary }]}>Phone</Text>
              <Text style={[styles.visitsCell, styles.headerText, { color: colors.secondary }]}>Visits</Text>
              <Text style={[styles.lastVisitCell, styles.headerText, { color: colors.secondary }]}>Last visit</Text>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(patient) => patient.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={[styles.noMatch, { color: colors.secondary }]}>No patients match “{search.trim()}”.</Text>
              }
              renderItem={({ item, index }) => (
                <Pressable
                  accessibilityLabel={`${fullName(item)}, ${item.visit_count} visits. Show options`}
                  accessibilityRole="button"
                  onPress={() => setSelected(item)}
                  style={({ pressed }) => [
                    styles.row,
                    { borderTopColor: colors.border },
                    index % 2 === 1 && { backgroundColor: colors.surface },
                    pressed && { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Text style={[styles.nameCell, styles.nameText, { color: colors.text }]} numberOfLines={2}>
                    {fullName(item)}
                  </Text>
                  <Text style={[styles.phoneCell, styles.bodyText, { color: colors.text }]} numberOfLines={1}>
                    {item.mobile_number || '—'}
                  </Text>
                  <Text style={[styles.visitsCell, styles.bodyText, { color: colors.text }]}>{item.visit_count}</Text>
                  <Text
                    style={[styles.lastVisitCell, styles.bodyText, { color: item.last_visit_at ? colors.text : colors.muted }]}
                    numberOfLines={1}
                  >
                    {item.last_visit_at ? formatLastVisit(item.last_visit_at) : 'Never'}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      )}

      <PatientActionsSheet patient={selected} onClose={() => setSelected(null)} onDeleted={reload} />
    </SafeAreaView>
  )
}

function fullName(patient: PatientOverview) {
  return [patient.first_name, patient.last_name].filter(Boolean).join(' ')
}

// "Today", "Yesterday", "21 Sep", or "21 Sep 25" for earlier years
function formatLastVisit(value: string) {
  const date = new Date(value)
  const today = startOfDay(new Date()).getTime()
  const day = startOfDay(date).getTime()
  if (day === today) return 'Today'
  if (day === today - 24 * 60 * 60 * 1000) return 'Yesterday'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: sameYear ? undefined : '2-digit' })
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
  emptyButton: {
    width: 220,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
  count: {
    fontSize: 13,
    marginTop: 14,
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
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  headerRow: {
    borderTopWidth: 0,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  nameCell: {
    flex: 1,
  },
  phoneCell: {
    width: 104,
  },
  visitsCell: {
    width: 42,
    textAlign: 'center',
  },
  lastVisitCell: {
    width: 70,
    textAlign: 'right',
  },
  noMatch: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
})
