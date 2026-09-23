import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { countries, type Country } from '@/constants/countries'
import { radius } from '@/constants/theme'
import { useTheme } from '@/providers/theme-provider'

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  label: string
  country: Country
  onCountryChange: (country: Country) => void
  value: string
  onChangeText: (text: string) => void
  errorText?: string
}

export default function PhoneInput({
  label,
  country,
  onCountryChange,
  value,
  onChangeText,
  errorText,
  ...props
}: Props) {
  const { colors } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const filtered = countries.filter(
    (c) => c.name.toLowerCase().includes(query) || c.dialCode.includes(query),
  )

  const fieldStyle = {
    backgroundColor: colors.surface,
    borderColor: errorText ? colors.error : colors.border,
  }

  const closePicker = () => {
    setPickerOpen(false)
    setSearch('')
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code ${country.name} ${country.dialCode}`}
          onPress={() => setPickerOpen(true)}
          style={[styles.field, styles.countryButton, fieldStyle]}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.dialCode, { color: colors.text }]}>{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          maxLength={15}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
          style={[styles.field, styles.numberInput, fieldStyle, { color: colors.text }]}
          {...props}
        />
      </View>
      {errorText ? (
        <Text style={[styles.error, { color: colors.error }]}>{errorText}</Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={closePicker}
      >
        <View style={styles.backdrop}>
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: colors.background }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Select country</Text>
              <Pressable accessibilityLabel="Close" hitSlop={12} onPress={closePicker}>
                <Ionicons name="close" size={24} color={colors.secondary} />
              </Pressable>
            </View>
            <TextInput
              placeholder="Search country or code"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              style={[
                styles.field,
                styles.search,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === country.code
                return (
                  <Pressable
                    onPress={() => {
                      onCountryChange(item)
                      closePicker()
                    }}
                    style={({ pressed }) => [
                      styles.countryRow,
                      (pressed || selected) && { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={[styles.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ color: colors.secondary }}>{item.dialCode}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.link} />
                    ) : null}
                  </Pressable>
                )
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  flag: {
    fontSize: 18,
  },
  dialCode: {
    fontSize: 16,
  },
  numberInput: {
    flex: 1,
  },
  error: {
    fontSize: 13,
    paddingTop: 8,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  search: {
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
  },
})
