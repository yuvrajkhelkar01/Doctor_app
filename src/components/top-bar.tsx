import Ionicons from '@expo/vector-icons/Ionicons'
import { type Href, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

type Props = {
  title: string
  // Where the back arrow goes when there's no history, e.g. after a page refresh on web
  fallbackHref: Href
}

export default function TopBar({ title, fallbackHref }: Props) {
  const { colors } = useTheme()

  const onBackPressed = () => {
    if (router.canGoBack()) router.back()
    else router.replace(fallbackHref)
  }

  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBackPressed}
        style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.65 : 1 }]}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.iconButton} />
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
})
