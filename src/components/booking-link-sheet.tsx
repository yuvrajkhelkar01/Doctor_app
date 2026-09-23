import Ionicons from '@expo/vector-icons/Ionicons'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Pressable, Share, StyleSheet, Text, View } from 'react-native'

import BottomSheet from '@/components/bottom-sheet'
import Button from '@/components/button'
import { radius } from '@/constants/theme'
import { bookingFormUrl, regenerateBookingToken } from '@/lib/booking'
import { useTheme } from '@/providers/theme-provider'

type Props = {
  visible: boolean
  token: string
  onClose: () => void
  // Called after a new link is generated, so the profile reloads with the new token
  onRegenerated: () => void
}

// The doctor's public booking link: copy it, share it, or replace it with a new one
export default function BookingLinkSheet({ visible, token, onClose, onRegenerated }: Props) {
  const { colors } = useTheme()
  const [confirmingNew, setConfirmingNew] = useState(false)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (visible) {
      setConfirmingNew(false)
      setNotice('')
      setError('')
    }
  }

  const url = bookingFormUrl(token)
  const problem = !token
    ? "Your booking link isn't ready yet. Reload the app and open this again."
    : 'Set EXPO_PUBLIC_WEB_URL to your hosted web address to get a shareable link.'

  const onCopy = async () => {
    await Clipboard.setStringAsync(url)
    setNotice('Link copied.')
  }

  const onShare = async () => {
    try {
      await Share.share({ message: url })
    } catch {
      setError("Couldn't open the share menu. Copy the link instead.")
    }
  }

  const onRegenerate = async () => {
    setWorking(true)
    setError('')
    const fresh = await regenerateBookingToken()
    setWorking(false)
    if (!fresh) {
      setError("Couldn't create a new link. Try again.")
      return
    }
    setConfirmingNew(false)
    setNotice('New link created. The old one no longer works.')
    onRegenerated()
  }

  return (
    <BottomSheet
      visible={visible}
      title="Booking form link"
      subtitle="Patients use this to request an appointment"
      onClose={() => !working && onClose()}
    >
      {url ? (
        <Pressable
          accessibilityLabel={`Booking link ${url}. Tap to copy`}
          accessibilityRole="button"
          onPress={onCopy}
          style={({ pressed }) => [
            styles.linkBox,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="link-outline" size={20} color={colors.primary} />
          <Text style={[styles.link, { color: colors.text }]} numberOfLines={2} selectable>
            {url}
          </Text>
          <Ionicons name="copy-outline" size={18} color={colors.muted} />
        </Pressable>
      ) : (
        <View style={[styles.linkBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <Text style={[styles.link, { color: colors.secondary }]}>{problem}</Text>
        </View>
      )}

      <Text style={[styles.help, { color: colors.secondary }]}>
        Put this link on your website or send it to patients. What they submit shows up on your dashboard, above the
        schedule, waiting for you to accept or decline.
      </Text>

      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      {error ? <Text style={[styles.notice, { color: colors.error }]}>{error}</Text> : null}

      {url ? (
        <View style={styles.actions}>
          <Button icon="copy-outline" onPress={onCopy}>
            Copy link
          </Button>
          <Button mode="outlined" icon="share-outline" onPress={onShare}>
            Share link
          </Button>
        </View>
      ) : null}

      {confirmingNew ? (
        <View style={[styles.warning, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.text }]}>
            A new link replaces this one. Anywhere the old link is published will stop working until you update it.
          </Text>
        </View>
      ) : null}

      {confirmingNew ? (
        <View style={styles.actions}>
          <Button icon="refresh" loading={working} onPress={onRegenerate}>
            Yes, create a new link
          </Button>
          <Button mode="outlined" onPress={() => setConfirmingNew(false)}>
            Cancel
          </Button>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            setNotice('')
            setConfirmingNew(true)
          }}
          style={styles.regenerate}
        >
          <Text style={[styles.regenerateText, { color: colors.link }]}>Generate a new link</Text>
        </Pressable>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginTop: 8,
  },
  link: {
    flex: 1,
    fontSize: 14,
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  notice: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  actions: {
    marginTop: 4,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius,
    padding: 14,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  regenerate: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
