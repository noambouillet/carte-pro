export const cleanSiren = (value: string) => value.replace(/\D/g, '').slice(0, 9)

export const formatSiren = (digits: string) =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)]
    .filter(Boolean)
    .join(' ')

export const validateSiren = (digits: string): string | null => {
  if (digits === '') {
    return 'Le numéro SIREN est obligatoire.'
  }

  if (digits.length !== 9) {
    return `Le SIREN comporte 9 chiffres, ${digits.length} saisi${
      digits.length > 1 ? 's' : ''
    }.`
  }

  let sum = 0

  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[index])

    if (index % 2 === 1) {
      digit *= 2

      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  return sum % 10 === 0
    ? null
    : 'Ce numéro SIREN est invalide : la clé de contrôle ne correspond pas.'
}
