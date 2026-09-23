import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button from '@/components/button'
import OptionRow from '@/components/option-row'
import { radius } from '@/constants/theme'
import type { PatientOverview } from '@/hooks/use-patient-overview'
import { deletePatient } from '@/lib/patients'
import { useTheme } from '@/providers/theme-provider'

type Props = {
  // The tapped patient; null keeps the sheet closed
  patient: PatientOverview | null
  onClose: () => void
  // Called after the patient was deleted, so the list can refresh
  onDeleted: () => void
}

// Options for a patient in the Patients list: open their profile, or delete them
export default function PatientActionsSheet({ patient, onClose, onDeleted }: Props) {
  const { colors } = useTheme()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Keep showing the last patient while the sheet slides away, and start over each time it opens
  const [shown, setShown] = useState(patient)
  const [wasOpen, setWasOpen] = useState(false)
  if (!!patient !== wasOpen) setWasOpen(!!patient)
  if (patient && (patient !== shown || !wasOpen)) {
    setShown(patient)
    setConfirming(false)
    setError('')
  }

  if (!shown) return null

  const name = [shown.first_name, shown.last_name].filter(Boolean).join(' ')
  const visits = `${shown.visit_count} ${shown.visit_count === 1 ? 'visit' : 'visits'}`

  const close = () => {
    if (!deleting) onClose()
  }

  const onDeletePressed = async () => {
    setDeleting(true)
    setError('')
    const message = await deletePatient(shown.id)
    setDeleting(false)
    if (message) {
      setError(message)
      return
    }
    onDeleted()
    onClose()
  }

  return (
    <Modal visible={!!patient} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            {confirming ? (
              <Pressable
                accessibilityLabel="Back"
                accessibilityRole="button"
                hitSlop={12}
                disabled={deleting}
                onPress={() => {
                  setError('')
                  setConfirming(false)
                }}
              >
                <Ionicons name="arrow-back" size={22} color={colors.secondary} />
              </Pressable>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{shown.first_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {confirming ? 'Delete patient' : name}
              </Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={1}>
                {confirming ? name : [shown.mobile_number, visits].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={close}>
              <Ionicons name="close" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          {!confirming ? (
            <View style={styles.options}>
              <OptionRow
                icon="person-outline"
                title="View profile"
                description={`Open ${name}'s patient page`}
                onPress={() => {
                  onClose()
                  router.push({ pathname: '/patients/[id]', params: { id: shown.id } })
                }}
              />
              <OptionRow
                icon="trash-outline"
                title="Delete patient"
                description="Remove the patient and their records"
                destructive
                onPress={() => setConfirming(true)}
              />
            </View>
          ) : (
            <View>
              <View style={[styles.warning, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="warning-outline" size={22} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.text }]}>
                  This permanently deletes {name}, their case study, {visits} and all their appointments. It
                  can&apos;t be undone.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: deleting, disabled: deleting }}
                disabled={deleting}
                onPress={onDeletePressed}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error, opacity: pressed || deleting ? 0.8 : 1 }]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Ionicons name="trash" size={18} color={colors.onPrimary} />
                )}
                <Text style={[styles.deleteText, { color: colors.onPrimary }]}>Delete patient</Text>
              </Pressable>
              <Button mode="outlined" onPress={() => setConfirming(false)}>
                Keep patient
              </Button>
            </View>
          )}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
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
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
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
  options: {
    gap: 12,
    paddingBottom: 12,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginBottom: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
    paddingVertical: 15,
    borderRadius: radius,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 8,
  },
})
