export type CategoryKind = 'entrada' | 'saida' | 'meta' | 'transferencia'

export interface Group {
  id: string
  name: string
  kind: CategoryKind
}

export interface Category {
  id: string
  name: string
  groupId: string
}

export interface Account {
  id: string
  name: string
}

export interface Split {
  categoryId: string
  amount: number
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  accountId?: string
  splits: Split[]
}

export interface ImportBatch {
  id: string
  fileName: string
  importedAt: string
  accountId?: string
  coveredDays?: string[]
  transactionIds: string[]
}

export type ForecastRecurrence = 'monthly' | 'once'

export interface ForecastOverride {
  amount?: number
  date?: string
}

export interface Forecast {
  id: string
  description: string
  amount: number
  categoryId: string
  accountId?: string
  recurrence: ForecastRecurrence
  startMonth: string
  endMonth?: string
  skippedMonths: string[]
  overrides: Record<string, ForecastOverride>
  settledBy: Record<string, string[]>
}

export interface CreditCard {
  id: string
  accountId: string
  limit: number
  closingDay: number
  dueDay: number
  paymentAccountId?: string
  paidBy: Record<string, string[]>
}

export interface SummaryRow {
  label: string
  categoryId?: string
  values: number[]
  previstoValues?: number[]
  objetivo?: number
  falta?: number
  variant?: 'normal' | 'subtotal' | 'group'
}

export interface SummarySection {
  title?: string
  rows: SummaryRow[]
}
