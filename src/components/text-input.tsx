import { StyleSheet, Text, TextInput as Input, View, type TextInputProps } from 'react-native'

import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'

type Props = TextInputProps & {
  label: string
  errorText?: string
}

export default function TextInput({ label, errorText, style, ...props }: Props) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
      <Input
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: errorText ? colors.error : colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
      {errorText ? (
        <Text style={[styles.error, { color: colors.error }]}>{errorText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    paddingTop: 8,
  },
})
