export function isValidEmail(email: string): boolean {
  const value = email.trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
}

export type PasswordRequirements = {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    length: password.length >= 12 && password.length <= 128,
    lowercase: /\p{Ll}/u.test(password),
    uppercase: /\p{Lu}/u.test(password),
    number: /\d/.test(password),
    symbol: /[^\p{L}\d]/u.test(password),
  };
}

export function isValidRegistrationPassword(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return Object.values(requirements).every(Boolean);
}

export function getPasswordStrength(password: string): 'empty' | 'weak' | 'fair' | 'strong' {
  if (!password) return 'empty';
  const checks = [
    password.length >= 12 && password.length <= 128,
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\d/.test(password),
    /[^\p{L}\d]/u.test(password),
  ];
  const score = checks.filter(Boolean).length;
  return score === checks.length ? 'strong' : score >= 3 ? 'fair' : 'weak';
}
