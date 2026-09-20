import type { ImportBatch, Transaction } from '../data/types'

export interface ImportEntry {
  date: string
  description: string
  amount: number
}

export interface ImportInput {
  fileName: string
  accountId: string
  categoryId: string
  entries: ImportEntry[]
}

export interface ImportResult {
  imported: number
  skipped: number
  importedDays: string[]
  skippedDays: string[]
}

function uniqueSortedDays(entries: Array<{ date: string }>): string[] {
  return [...new Set(entries.map((entry) => entry.date))].sort()
}

function legacyBatchDays(batch: ImportBatch, accountId: string, transactionById: Map<string, Transaction>): string[] {
  return batch.transactionIds
    .map((id) => transactionById.get(id))
    .filter((transaction): transaction is Transaction => transaction !== undefined && transaction.accountId === accountId)
    .map((transaction) => transaction.date)
}

function batchCoveredDays(batch: ImportBatch, accountId: string, transactionById: Map<string, Transaction>): string[] {
  if (!batch.coveredDays) return legacyBatchDays(batch, accountId, transactionById)
  if (batch.accountId !== accountId) return []
  return batch.coveredDays
}

export function coveredDaysForAccount(accountId: string, batches: ImportBatch[], transactions: Transaction[]): Set<string> {
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]))
  const coveredDays = new Set<string>()
  for (const batch of batches) {
    batchCoveredDays(batch, accountId, transactionById).forEach((day) => coveredDays.add(day))
  }
  return coveredDays
}

export function partitionByCoveredDays<T extends { date: string }>(entries: T[], coveredDays: Set<string>) {
  const toImport = entries.filter((entry) => !coveredDays.has(entry.date))
  const skipped = entries.filter((entry) => coveredDays.has(entry.date))
  return {
    toImport,
    importedDays: uniqueSortedDays(toImport),
    skippedDays: uniqueSortedDays(skipped),
  }
}
