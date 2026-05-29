import { useMemo } from 'react';

export interface PasswordCheck {
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function usePasswordStrength(password: string) {
  const checks: PasswordCheck[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Number (0-9)', met: /\d/.test(password) },
    { label: 'Symbol (!@#$...)', met: /[^a-zA-Z0-9]/.test(password) },
  ], [password]);

  const allMet = checks.every((c) => c.met);

  const strength: PasswordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-400' };
    if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-400' };
    if (score === 4) return { score, label: 'Good', color: 'bg-blue-400' };
    return { score, label: 'Strong', color: 'bg-[#15DB95]' };
  }, [password]);

  return { checks, strength, allMet };
}
