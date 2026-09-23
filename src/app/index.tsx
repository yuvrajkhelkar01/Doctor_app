import { Image } from 'expo-image'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet } from 'react-native'

import HeartbeatLine, { HEARTBEAT_WIDTH } from '@/components/heartbeat-line'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'

// Intro shown when the app opens: the logo pops in, an ECG trace draws across, and the logo
// beats with the spike. Then the app moves on to the dashboard, or to login when signed out.
// Tap anywhere to skip; skipped entirely when the device asks for reduced motion.
export default function IntroScreen() {
  const { colors } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const [finished, setFinished] = useState(false)
  const [values] = useState(() => ({
    logoScale: new Animated.Value(0.6),
    logoOpacity: new Animated.Value(0),
    beat: new Animated.Value(1),
    ripple: new Animated.Value(0),
    line: new Animated.Value(0),
    text: new Animated.Value(0),
    screen: new Animated.Value(1),
  }))

  useEffect(() => {
    const { logoScale, logoOpacity, beat, ripple, line, text } = values
    // Width animations can't run on the native driver, so the whole intro stays on JS for simplicity
    const timing = (value: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: false })

    const intro = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: false }),
        timing(logoOpacity, 1, 350),
      ]),
      timing(line, HEARTBEAT_WIDTH, 950, Easing.inOut(Easing.quad)),
      Animated.parallel([
        // "Lub-dub"
        Animated.sequence([
          timing(beat, 1.14, 110),
          timing(beat, 1, 110),
          timing(beat, 1.08, 90),
          timing(beat, 1, 160),
        ]),
        timing(ripple, 1, 750),
        timing(text, 1, 450),
      ]),
      Animated.delay(450),
    ])

    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return
      if (reduceMotion) {
        showFinalFrame(values)
        setFinished(true)
      } else intro.start(({ finished: done }) => done && setFinished(true))
    })

    return () => {
      cancelled = true
      intro.stop()
    }
  }, [values])

  // Leave once the intro is over and we know whether someone is signed in
  useEffect(() => {
    if (!finished || authLoading) return
    Animated.timing(values.screen, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
      router.replace(session ? '/dashboard' : '/login')
    })
  }, [finished, authLoading, session, values])

  // Setting the values also stops the running intro
  const onSkip = () => {
    if (finished) return
    showFinalFrame(values)
    setFinished(true)
  }

  const { logoScale, logoOpacity, beat, ripple, line, text, screen } = values

  return (
    <Pressable
      accessibilityLabel="Clinic Care. Tap to continue"
      accessibilityRole="button"
      onPress={onSkip}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.View style={[styles.content, { opacity: screen }]}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity }]}>
          <Animated.View
            style={[
              styles.ripple,
              {
                borderColor: colors.primary,
                opacity: ripple.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.6, 0] }),
                transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.badge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                boxShadow: `0 0 40px ${colors.glow}`,
                transform: [{ scale: Animated.multiply(logoScale, beat) }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/clinic-care-logo.svg')}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Clinic Care logo"
            />
          </Animated.View>
        </Animated.View>

        <HeartbeatLine progress={line} />

        <Animated.View
          style={{
            opacity: text,
            transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Animated.Text style={[styles.title, { color: colors.text }]}>Clinic Care</Animated.Text>
          <Animated.Text style={[styles.tagline, { color: colors.secondary }]}>Your clinic, in your pocket</Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

// Jumps every part of the intro to how it looks at the end
function showFinalFrame(values: { logoScale: Animated.Value; logoOpacity: Animated.Value; line: Animated.Value; text: Animated.Value }) {
  values.logoScale.setValue(1)
  values.logoOpacity.setValue(1)
  values.line.setValue(HEARTBEAT_WIDTH)
  values.text.setValue(1)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 28,
  },
  logoWrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
  },
  badge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 104,
    height: 104,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
  },
})
