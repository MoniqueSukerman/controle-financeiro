import type { Transaction } from '../data/types'

export function yearOf(dateIso: string): number {
  return Number.parseInt(dateIso.slice(0, 4), 10)
}

export function monthOf(dateIso: string): number {
  return Number.parseInt(dateIso.slice(5, 7), 10) - 1
}

export function getAvailableYears(transactions: Transaction[], mustInclude: number): number[] {
  const years = new Set(transactions.map((t) => yearOf(t.date)))
  years.add(mustInclude)
  return Array.from(years).sort((a, b) => a - b)
}
