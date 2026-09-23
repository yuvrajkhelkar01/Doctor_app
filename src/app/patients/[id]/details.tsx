import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import type { ComponentProps } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import TopBar from '@/components/top-bar'
import { radius } from '@/constants/theme'
import { type Patient, usePatient } from '@/hooks/use-patient'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'

export default function PatientDetailsScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, loading: authLoading } = useAuth()
  const { patient, loading, error } = usePatient(session ? id : undefined)

  if (!authLoading && !session) return <Redirect href="/login" />

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="Patient details" fallbackHref={{ pathname: '/patients/[id]', params: { id } }} />

      {authLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !patient ? (
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={32} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>{error || 'Patient not found.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {detailSections(patient).map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {section.rows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.row,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}
                  >
                    <Ionicons name={row.icon} size={20} color={colors.primary} style={styles.rowIcon} />
                    <View style={styles.rowBody}>
                      <Text style={[styles.label, { color: colors.secondary }]}>{row.label}</Text>
                      <Text style={[styles.value, { color: row.value ? colors.text : colors.muted }]} selectable>
                        {row.value || 'Not added'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

type DetailRow = {
  label: string
  value: string | null
  icon: ComponentProps<typeof Ionicons>['name']
}

function detailSections(patient: Patient): { title: string; rows: DetailRow[] }[] {
  return [
    {
      title: 'Personal',
      rows: [
        { label: 'First name', value: patient.first_name, icon: 'person-outline' },
        { label: 'Last name', value: patient.last_name, icon: 'person-outline' },
        {
          label: 'Date of birth',
          value: patient.date_of_birth ? formatBirthDate(patient.date_of_birth) : null,
          icon: 'gift-outline',
        },
        { label: 'Added on', value: patient.created_at ? formatDate(patient.created_at) : null, icon: 'time-outline' },
      ],
    },
    {
      title: 'Contact',
      rows: [
        { label: 'Phone number', value: patient.mobile_number, icon: 'call-outline' },
        { label: 'Email', value: patient.email, icon: 'mail-outline' },
      ],
    },
    {
      title: 'Medical',
      rows: [
        { label: 'Medical history', value: patient.medical_history, icon: 'medkit-outline' },
        { label: 'Case notes', value: patient.case_notes, icon: 'document-text-outline' },
      ],
    },
  ]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// date_of_birth is a plain date ("1990-04-12"); read it as local, not UTC, so the day doesn't shift
function formatBirthDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} (${age} yrs)`
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
    padding: 20,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  group: {
    borderWidth: 1,
    borderRadius: radius,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    lineHeight: 21,
  },
})
