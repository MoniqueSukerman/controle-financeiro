import type { CreditCard, Transaction } from '../data/types'

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function clampDay(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(day, lastDay)
}

function isoDate(year: number, monthIndex: number, day: number): string {
  const clampedDay = clampDay(year, monthIndex, day)
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

function shiftMonth(year: number, monthIndex: number, offset: number): { year: number; monthIndex: number } {
  const total = year * 12 + monthIndex + offset
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 }
}

export type InvoiceStatus = 'aberta' | 'pendente' | 'paga'

export interface CreditCardInvoice {
  card: CreditCard
  year: number
  monthIndex: number
  monthKey: string
  periodStart: string
  closingDate: string
  dueDate: string
  transactions: Transaction[]
  total: number
  status: InvoiceStatus
  paidTransactionIds: string[]
}

export function invoiceForMonth(card: CreditCard, transactions: Transaction[], year: number, monthIndex: number): CreditCardInvoice {
  const closingDate = isoDate(year, monthIndex, card.closingDay)
  const previous = shiftMonth(year, monthIndex, -1)
  const periodStart = isoDate(previous.year, previous.monthIndex, card.closingDay)

  const dueInNextMonth = card.dueDay <= card.closingDay
  const dueMonth = dueInNextMonth ? shiftMonth(year, monthIndex, 1) : { year, monthIndex }
  const dueDate = isoDate(dueMonth.year, dueMonth.monthIndex, card.dueDay)

  const cardTransactions = transactions
    .filter((t) => t.accountId === card.accountId && t.date > periodStart && t.date <= closingDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const total = cardTransactions.reduce((sum, t) => sum + t.amount, 0)
  const key = monthKey(year, monthIndex)
  const paidTransactionIds = card.paidBy[key] ?? []

  const todayStr = new Date().toISOString().slice(0, 10)
  const status: InvoiceStatus = paidTransactionIds.length > 0 ? 'paga' : todayStr <= closingDate ? 'aberta' : 'pendente'

  return {
    card,
    year,
    monthIndex,
    monthKey: key,
    periodStart,
    closingDate,
    dueDate,
    transactions: cardTransactions,
    total,
    status,
    paidTransactionIds,
  }
}

export function invoicesForMonth(cards: CreditCard[], transactions: Transaction[], year: number, monthIndex: number): CreditCardInvoice[] {
  return cards.map((card) => invoiceForMonth(card, transactions, year, monthIndex))
}
