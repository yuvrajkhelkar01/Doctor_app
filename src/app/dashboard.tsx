import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { Redirect, router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import DayCalendar from '@/components/day-calendar'
import { radius } from '@/constants/theme'
import { useDoctorProfile } from '@/hooks/use-doctor-profile'
import { usePatientSearch, type PatientSummary } from '@/hooks/use-patient-search'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'

export default function DashboardScreen() {
  const { colors, mode, toggleTheme } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, error } = useDoctorProfile(session?.user.id)
  const { width: windowWidth } = useWindowDimensions()
  const [signingOut, setSigningOut] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { patients, loading: searching, error: searchError } = usePatientSearch(search)
  const [notice, setNotice] = useState('')
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())
  const drawerWidth = Math.min(windowWidth * 0.84, 360)
  const [drawerPosition] = useState(() => new Animated.Value(-drawerWidth))

  useEffect(() => {
    Animated.timing(drawerPosition, {
      toValue: drawerOpen ? 0 : -drawerWidth,
      duration: 260,
      useNativeDriver: true,
    }).start()
  }, [drawerOpen, drawerPosition, drawerWidth])

  useEffect(() => {
    const refreshGreeting = () => setCurrentHour(new Date().getHours())
    const interval = setInterval(refreshGreeting, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (!session) return <Redirect href="/login" />

  const closeDrawer = () => {
    Animated.timing(drawerPosition, {
      toValue: -drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerOpen(false)
    })
  }

  const onSignOutPressed = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const doctorName = profile?.last_name || profile?.first_name || 'Doctor'
  const greeting = getGreeting(currentHour)
  const showSearchState = search.trim().length > 0

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Open navigation menu"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="menu-outline" size={28} color={colors.text} />
          </Pressable>
          <View style={styles.greeting}>
            <Text style={[styles.title, { color: colors.text }]}>{greeting}, Dr. {doctorName}</Text>
          </View>
          <View style={styles.themeSpace} />
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.secondary} />
          <TextInput
            accessibilityLabel="Search patients"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search patients..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear patient search" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {showSearchState ? (
          <View style={[styles.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {searching ? (
              <ActivityIndicator color={colors.primary} style={styles.searchState} />
            ) : searchError ? (
              <Text style={[styles.searchState, styles.searchStateText, { color: colors.error }]}>{searchError}</Text>
            ) : patients.length === 0 ? (
              <View style={styles.searchState}>
                <Ionicons name="people-outline" size={22} color={colors.secondary} />
                <Text style={[styles.searchStateText, { color: colors.secondary }]}>No patients match “{search.trim()}”.</Text>
              </View>
            ) : (
              patients.map((patient, index) => (
                <PatientResult
                  key={patient.id}
                  colors={colors}
                  patient={patient}
                  showDivider={index > 0}
                  onPress={() => router.push({ pathname: '/patients/[id]', params: { id: patient.id } })}
                />
              ))
            )}
          </View>
        ) : null}

        <SectionTitle title="Quick actions" colors={colors} />
        <View style={styles.actionsRow}>
          <QuickAction
            colors={colors}
            icon="person-add-outline"
            label="Add patient"
            description="Create a new patient record"
            onPress={() => router.push('/add-patient')}
          />
        </View>

        {notice ? (
          <Pressable onPress={() => setNotice('')} style={[styles.notice, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.noticeText, { color: colors.text }]}>{notice}</Text>
            <Ionicons name="close" size={18} color={colors.secondary} />
          </Pressable>
        ) : null}

        <SectionTitle title="Schedule" colors={colors} />
        <DayCalendar doctorId={session.user.id} />

        {profileLoading ? <ActivityIndicator color={colors.primary} style={styles.profileStatus} /> : null}
        {!profileLoading && !profile && error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      </ScrollView>

      <Modal animationType="none" transparent visible={drawerOpen} onRequestClose={closeDrawer}>
        <View style={styles.drawerOverlay}>
          <Animated.View
            style={[styles.drawer, { width: drawerWidth, backgroundColor: colors.background, transform: [{ translateX: drawerPosition }] }]}
          >
            <SafeAreaView style={styles.drawerContent}>
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
                {profile?.profile_photo_url ? (
                  <Image source={profile.profile_photo_url} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Ionicons name="medical-outline" size={24} color={colors.primary} />
                )}
              </View>
              <View style={styles.drawerIdentity}>
                <Text style={[styles.drawerName, { color: colors.text }]}>Dr. {doctorName}</Text>
                <Text style={[styles.drawerEmail, { color: colors.secondary }]}>{session.user.email}</Text>
              </View>
              <Pressable accessibilityLabel="Close navigation menu" onPress={closeDrawer}>
                <Ionicons name="close" size={24} color={colors.secondary} />
              </Pressable>
            </View>
            <View style={styles.drawerItems}>
              <DrawerItem colors={colors} icon="person-outline" label="Manage my account" onPress={() => { closeDrawer(); router.push('/account') }} />
              <DrawerItem colors={colors} icon="people-outline" label="Patients" onPress={() => { closeDrawer(); router.push('/patients') }} />
              <DrawerItem colors={colors} icon="calendar-outline" label="Appointments" onPress={() => { closeDrawer(); setNotice('Appointments are ready for the next step.') }} />
              <DrawerItem colors={colors} icon="settings-outline" label="Settings" onPress={() => { closeDrawer(); setNotice('Settings are ready for the next step.') }} />
              <ThemeSetting colors={colors} mode={mode} onPress={toggleTheme} />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={signingOut}
              onPress={onSignOutPressed}
              style={({ pressed }) => [styles.signOut, { borderColor: colors.border, opacity: pressed || signingOut ? 0.65 : 1 }]}
            >
              {signingOut ? <ActivityIndicator color={colors.error} /> : <Ionicons name="log-out-outline" size={20} color={colors.error} />}
              <Text style={[styles.signOutText, { color: colors.error }]}>Sign out</Text>
            </Pressable>
            </SafeAreaView>
          </Animated.View>
          <Pressable onPress={closeDrawer} style={styles.drawerDismiss} />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
}

function QuickAction({
  colors,
  icon,
  label,
  description,
  onPress,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  description: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.quickActionBody}>
        <Text style={[styles.quickActionText, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.quickActionDescription, { color: colors.secondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

function PatientResult({
  colors,
  patient,
  showDivider,
  onPress,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  patient: PatientSummary
  showDivider: boolean
  onPress: () => void
}) {
  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ')

  return (
    <Pressable
      accessibilityLabel={`Open ${fullName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.patientResult,
        showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <View style={[styles.patientAvatar, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.patientInitial, { color: colors.primary }]}>{patient.first_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.patientInfo}>
        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>{fullName}</Text>
        {patient.mobile_number ? (
          <Text style={[styles.patientPhone, { color: colors.secondary }]}>{patient.mobile_number}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

function DrawerItem({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.drawerItem, { opacity: pressed ? 0.65 : 1 }]}>
      <Ionicons name={icon} size={21} color={colors.secondary} />
      <Text style={[styles.drawerItemText, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

function ThemeSetting({
  colors,
  mode,
  onPress,
}: {
  colors: ReturnType<typeof useTheme>['colors']
  mode: 'light' | 'dark'
  onPress: () => void
}) {
  const isDark = mode === 'dark'

  return (
    <Pressable
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.drawerItem, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={21} color={colors.secondary} />
      <Text style={[styles.drawerItemText, { color: colors.text }]}>{isDark ? 'Light mode' : 'Dark mode'}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
    paddingHorizontal: 8,
  },
  themeSpace: {
    width: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 15,
    minHeight: 54,
    marginBottom: 28,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  searchResults: {
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 14,
    marginTop: -16,
    marginBottom: 22,
  },
  searchState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  patientResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  patientPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  searchStateText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionsRow: {
    gap: 12,
    marginBottom: 28,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBody: {
    flex: 1,
  },
  quickActionText: {
    fontWeight: '600',
    fontSize: 15,
  },
  quickActionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: radius,
    padding: 14,
    marginTop: -12,
    marginBottom: 28,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
  },
  profileStatus: {
    marginTop: 24,
  },
  error: {
    textAlign: 'center',
    marginTop: 24,
  },
  drawerOverlay: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  drawerDismiss: {
    ...StyleSheet.absoluteFill,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 1,
    elevation: 1,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 22,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  drawerIdentity: {
    flex: 1,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  drawerEmail: {
    fontSize: 12,
  },
  drawerItems: {
    flex: 1,
    paddingTop: 22,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 54,
  },
  drawerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius,
    minHeight: 52,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
