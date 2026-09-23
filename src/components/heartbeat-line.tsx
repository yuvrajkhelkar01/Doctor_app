import { Animated, StyleSheet, View } from 'react-native'

import { useTheme } from '@/providers/theme-provider'

// One heartbeat of an ECG trace (P wave, QRS spike, T wave), as points in a WIDTH × HEIGHT box
export const HEARTBEAT_WIDTH = 260
const HEIGHT = 64
const BASELINE = 34
const POINTS: [number, number][] = [
  [0, BASELINE],
  [72, BASELINE],
  [82, BASELINE - 7],
  [92, BASELINE],
  [106, BASELINE],
  [114, BASELINE + 8],
  [124, 4],
  [134, HEIGHT - 6],
  [142, BASELINE],
  [158, BASELINE],
  [171, BASELINE - 9],
  [184, BASELINE],
  [HEARTBEAT_WIDTH, BASELINE],
]
const STROKE = 3

// Each straight piece of the trace, as a thin rotated bar
const SEGMENTS = POINTS.slice(1).map(([x2, y2], index) => {
  const [x1, y1] = POINTS[index]
  const length = Math.hypot(x2 - x1, y2 - y1)
  return {
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2 - STROKE / 2,
    width: length,
    angle: `${Math.atan2(y2 - y1, x2 - x1)}rad`,
  }
})

// An ECG trace drawn from left to right as `progress` goes from 0 to HEARTBEAT_WIDTH,
// with a glowing dot riding the tip of the line
export default function HeartbeatLine({ progress }: { progress: Animated.Value }) {
  const { colors } = useTheme()
  const tipY = progress.interpolate({
    inputRange: POINTS.map(([x]) => x),
    outputRange: POINTS.map(([, y]) => y),
    extrapolate: 'clamp',
  })

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.reveal, { width: progress }]}>
        {SEGMENTS.map((segment, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                left: segment.left,
                top: segment.top,
                width: segment.width,
                backgroundColor: colors.primary,
                transform: [{ rotate: segment.angle }],
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.tip,
          {
            backgroundColor: colors.primary,
            boxShadow: `0 0 12px 4px ${colors.glow}`,
            transform: [{ translateX: Animated.subtract(progress, 5) }, { translateY: Animated.subtract(tipY, 5) }],
            opacity: progress.interpolate({
              inputRange: [0, 8, HEARTBEAT_WIDTH - 20, HEARTBEAT_WIDTH],
              outputRange: [0, 1, 1, 0],
            }),
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: HEARTBEAT_WIDTH,
    height: HEIGHT,
  },
  reveal: {
    height: HEIGHT,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    height: STROKE,
    borderRadius: STROKE / 2,
  },
  tip: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
