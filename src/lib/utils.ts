import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validates a phone number containing exactly 10 digits (0-9), no other characters
export function isTenDigitPhone(value: string): boolean {
  if (!value) return false
  const digitsOnly = value.replace(/\D/g, "")
  return digitsOnly.length === 10
}

// Normalizes any phone-like string to its 10 trailing digits (useful for storage)
export function normalizeTenDigitPhone(value: string): string {
  const digitsOnly = (value || "").replace(/\D/g, "")
  return digitsOnly.slice(-10)
}
