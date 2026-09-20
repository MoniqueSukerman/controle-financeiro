import type { Forecast } from '../data/types'

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: string): { year: number; monthIndex: number } {
  const [yearPart, monthPart] = key.split('-')
  return { year: Number.parseInt(yearPart, 10), monthIndex: Number.parseInt(monthPart, 10) - 1 }
}

export type ForecastOccurrenceStatus = 'pendente' | 'realizada' | 'pulada'

export interface ForecastOccurrence {
  forecast: Forecast
  monthIndex: number
  monthKey: string
  date: string
  amount: number
  status: ForecastOccurrenceStatus
  settledTransactionIds: string[]
}

function appliesToMonth(forecast: Forecast, key: string): boolean {
  if (forecast.recurrence === 'once') return forecast.startMonth === key
  if (key < forecast.startMonth) return false
  if (forecast.endMonth && key > forecast.endMonth) return false
  return true
}

export function occurrencesForYear(forecasts: Forecast[], year: number): ForecastOccurrence[] {
  const occurrences: ForecastOccurrence[] = []

  for (const forecast of forecasts) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const key = monthKey(year, monthIndex)
      if (!appliesToMonth(forecast, key)) continue

      const override = forecast.overrides[key]
      const settledTransactionIds = forecast.settledBy[key] ?? []
      const status: ForecastOccurrenceStatus = settledTransactionIds.length > 0
        ? 'realizada'
        : forecast.skippedMonths.includes(key)
          ? 'pulada'
          : 'pendente'

      occurrences.push({
        forecast,
        monthIndex,
        monthKey: key,
        date: override?.date ?? `${key}-01`,
        amount: override?.amount ?? forecast.amount,
        status,
        settledTransactionIds,
      })
    }
  }

  return occurrences
}

export function occurrencesForMonth(forecasts: Forecast[], year: number, monthIndex: number): ForecastOccurrence[] {
  const key = monthKey(year, monthIndex)
  return occurrencesForYear(forecasts, year).filter((occurrence) => occurrence.monthKey === key)
}
