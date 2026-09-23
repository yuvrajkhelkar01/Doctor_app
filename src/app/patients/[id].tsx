import Ionicons from '@expo/vector-icons/Ionicons'
import { openURL } from 'expo-linking'
import { type Href, Redirect, router, Stack, useLocalSearchParams } from 'expo-router'
import { type ComponentProps, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ClockInSheet from '@/components/clock-in-sheet'
import TopBar from '@/components/top-bar'
import { radius } from '@/constants/theme'
import { usePatient } from '@/hooks/use-patient'
import { addVisit } from '@/lib/visits'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { formatDateTime } from '@/utils/dates'

export default function PatientProfileScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, loading: authLoading } = useAuth()
  const { patient, loading, error } = usePatient(session ? id : undefined)
  const [clockInOpen, setClockInOpen] = useState(false)
  // The visit just recorded, shown as a confirmation on this screen
  const [clockedInAt, setClockedInAt] = useState<Date | null>(null)

  if (!authLoading && !session) return <Redirect href="/login" />

  const fullName = patient ? [patient.first_name, patient.last_name].filter(Boolean).join(' ') : ''

  const onClockIn = async (visitedAt: Date) => {
    if (!patient) return 'Patient not found.'
    const message = await addVisit(patient.id, visitedAt)
    if (!message) setClockedInAt(visitedAt)
    return message
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar title="Patient" fallbackHref="/dashboard" />

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
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {patient.first_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {fullName}
              </Text>
              {patient.created_at ? (
                <Text style={[styles.meta, { color: colors.secondary }]}>Added {formatDate(patient.created_at)}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={`Clock in ${fullName}`}
              accessibilityRole="button"
              onPress={() => setClockInOpen(true)}
              style={({ pressed }) => [styles.clockInButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="time-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.clockInText, { color: colors.onPrimary }]}>Clock in</Text>
            </Pressable>
          </View>

          {clockedInAt ? (
            <View style={[styles.banner, { backgroundColor: colors.surfaceRaised }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={[styles.bannerText, { color: colors.text }]}>
                Clocked in · {formatDateTime(clockedInAt)}
              </Text>
              <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={() => setClockedInAt(null)}>
                <Ionicons name="close" size={18} color={colors.secondary} />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={21} color={colors.primary} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardLabel, { color: colors.secondary }]}>Phone number</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{patient.mobile_number || 'Not added'}</Text>
            </View>
            {patient.mobile_number ? (
              <Pressable
                accessibilityLabel={`Call ${fullName}`}
                accessibilityRole="button"
                onPress={() => openURL(`tel:${patient.mobile_number}`)}
                style={({ pressed }) => [styles.callButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name="call" size={18} color={colors.onPrimary} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.actions}>
            {PATIENT_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => Alert.alert(action.label, 'Coming soon.')}
                style={({ pressed }) => [
                  styles.actionTile,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name={action.icon} size={24} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.linkGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {patientLinks(patient.id).map((link, index) => (
              <Pressable
                key={link.label}
                accessibilityRole="button"
                accessibilityHint={link.description}
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [
                  styles.linkRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.linkIcon, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name={link.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                  <Text style={[styles.cardLabel, { color: colors.secondary }]}>{link.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Case study</Text>
          {patient.case_notes ? (
            <View style={[styles.notes, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.notesText, { color: colors.text }]} selectable>
                {patient.case_notes}
              </Text>
            </View>
          ) : (
            <Text style={[styles.meta, { color: colors.secondary }]}>No case notes added.</Text>
          )}
        </ScrollView>
      )}

      <ClockInSheet
        visible={clockInOpen}
        patientName={fullName}
        onClose={() => setClockInOpen(false)}
        onClockIn={onClockIn}
      />
    </SafeAreaView>
  )
}

const PATIENT_ACTIONS: { label: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { label: 'Get Case Study', icon: 'document-text-outline' },
  { label: 'Get Exercise Plan', icon: 'barbell-outline' },
  { label: 'Get Diet Plan', icon: 'nutrition-outline' },
  { label: 'Update Case Study', icon: 'create-outline' },
]

type PatientLink = {
  label: string
  description: string
  icon: ComponentProps<typeof Ionicons>['name']
  href: Href
}

function patientLinks(id: string): PatientLink[] {
  return [
    {
      label: 'Visit history',
      description: 'Dates and times of past visits',
      icon: 'calendar-outline',
      href: { pathname: '/patients/[id]/visits', params: { id } },
    },
    {
      label: 'Patient details',
      description: 'Contact info and medical history',
      icon: 'person-outline',
      href: { pathname: '/patients/[id]/details', params: { id } },
    },
  ]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  clockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  clockInText: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: -8,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginBottom: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  actionTile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkGroup: {
    borderWidth: 1,
    borderRadius: radius,
    marginBottom: 28,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  notes: {
    borderWidth: 1,
    borderRadius: radius,
    padding: 16,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
})
