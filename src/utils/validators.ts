const EMAIL_RE = /\S+@\S+\.\S+/

export function emailValidator(email: string) {
  if (!email) return "Email can't be empty."
  if (!EMAIL_RE.test(email)) return 'Ooops! We need a valid email address.'
  return ''
}

export function passwordValidator(password: string) {
  if (!password) return "Password can't be empty."
  if (password.length < 5) return 'Password must be at least 5 characters long.'
  return ''
}

export function nameValidator(name: string, label = 'Name') {
  if (!name.trim()) return `${label} can't be empty.`
  return ''
}

export function confirmPasswordValidator(password: string, confirmPassword: string) {
  if (!confirmPassword) return 'Please confirm your password.'
  if (password !== confirmPassword) return "Passwords don't match."
  return ''
}

export function phoneValidator(phone: string, expectedLength?: number) {
  if (!phone) return "Phone number can't be empty."
  if (expectedLength ? phone.length !== expectedLength : phone.length < 6) {
    return expectedLength
      ? `Phone number must be ${expectedLength} digits.`
      : 'Please enter a valid phone number.'
  }
  return ''
}
