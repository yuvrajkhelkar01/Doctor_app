export type Country = {
  code: string
  name: string
  dialCode: string
  flag: string
  // Expected national number length, when it's fixed
  length?: number
}

export const countries: Country[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', length: 10 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', length: 10 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', length: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', length: 10 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', length: 9 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', length: 9 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', length: 8 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', length: 8 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', length: 9 },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', length: 9 },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', length: 9 },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', length: 9 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', length: 10 },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', length: 10 },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', length: 9 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', length: 10 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', length: 9 },
]

export const defaultCountry = countries[0]
