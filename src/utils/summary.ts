import type { Account, Category, CategoryKind, Forecast, Group, Split, SummarySection, Transaction } from '../data/types'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../data/accounts'
import { monthOf, yearOf } from './period'
import { occurrencesForYear } from './forecast'
import type { ForecastOccurrence } from './forecast'

export type TransferSide = 'origem' | 'destino'

export interface SummaryScope {
  kinds: CategoryKind[]
  transferSide: TransferSide
}

function signedAmountForKind(amount: number, kind: CategoryKind | undefined, transferSide: TransferSide): number {
  const seenFromDestination = kind === 'transferencia' && transferSide === 'destino'
  return seenFromDestination ? -amount : amount
}

function signedSplitAmount(
  transaction: Transaction,
  split: Split,
  kind: CategoryKind | undefined,
  transferSide: TransferSide,
): number {
  const amountFromExtrato = transaction.amount < 0 ? -split.amount : split.amount
  return signedAmountForKind(amountFromExtrato, kind, transferSide)
}

function emptyYear(): number[] {
  return Array(12).fill(0)
}

function countsTowardBalance(dateIso: string, year: number): boolean {
  const month = monthOf(dateIso)
  return yearOf(dateIso) <= year && month >= 0 && month <= 11
}

function countsInMonth(dateIso: string, year: number, monthIndex: number): boolean {
  return yearOf(dateIso) === year && monthOf(dateIso) === monthIndex
}

export interface CategoryEntry {
  transaction: Transaction
  amount: number
}

export function collectCategoryEntries(
  transactions: Transaction[],
  categoryId: string,
  kind: CategoryKind | undefined,
  scope: SummaryScope,
  year: number,
  monthIndex: number,
): CategoryEntry[] {
  const entries: CategoryEntry[] = []

  for (const transaction of transactions) {
    if (!countsInMonth(transaction.date, year, monthIndex)) continue
    const amount = transaction.splits
      .filter((split) => split.categoryId === categoryId)
      .reduce((sum, split) => sum + signedSplitAmount(transaction, split, kind, scope.transferSide), 0)
    if (amount === 0) continue
    entries.push({ transaction, amount })
  }

  return entries.sort((a, b) => b.transaction.date.localeCompare(a.transaction.date))
}

function createBalanceLedger(year: number) {
  const movementsByKey = new Map<string, number[]>()
  const openingByKey = new Map<string, number>()

  function movementsFor(key: string): number[] {
    return movementsByKey.get(key) ?? movementsByKey.set(key, emptyYear()).get(key)!
  }

  function add(key: string, dateIso: string, amount: number) {
    if (yearOf(dateIso) < year) {
      openingByKey.set(key, (openingByKey.get(key) ?? 0) + amount)
      return
    }
    movementsFor(key)[monthOf(dateIso)] += amount
  }

  function balancesFor(key: string): number[] {
    let running = openingByKey.get(key) ?? 0
    return movementsFor(key).map((movement) => (running += movement))
  }

  function monthlyMovementsFor(key: string): number[] {
    return [...movementsFor(key)]
  }

  return { add, balancesFor, monthlyMovementsFor }
}

function sumRows(rows: Array<{ values: number[] }>): number[] {
  const total = emptyYear()
  for (const row of rows) {
    row.values.forEach((value, index) => {
      total[index] += value
    })
  }
  return total
}

type KindByCategoryId = Map<string, CategoryKind | undefined>

function buildKindByCategoryId(groups: Group[], categories: Category[]): KindByCategoryId {
  const groupKindById = new Map(groups.map((group) => [group.id, group.kind]))
  return new Map(categories.map((category) => [category.id, groupKindById.get(category.groupId)]))
}

export function buildCategorySections(
  transactions: Transaction[],
  forecasts: Forecast[],
  groups: Group[],
  categories: Category[],
  scope: SummaryScope,
  year: number,
): SummarySection[] {
  const kindByCategoryId = buildKindByCategoryId(groups, categories)
  const realLedger = createBalanceLedger(year)
  const previstoLedger = createBalanceLedger(year)

  for (const transaction of transactions) {
    if (!countsTowardBalance(transaction.date, year)) continue
    for (const split of transaction.splits) {
      if (!kindByCategoryId.has(split.categoryId)) continue
      const amount = signedSplitAmount(transaction, split, kindByCategoryId.get(split.categoryId), scope.transferSide)
      realLedger.add(split.categoryId, transaction.date, amount)
      previstoLedger.add(split.categoryId, transaction.date, amount)
    }
  }

  for (const occurrence of occurrencesForYear(forecasts, year)) {
    if (occurrence.status !== 'pendente') continue
    const kind = kindByCategoryId.get(occurrence.forecast.categoryId)
    if (!kind) continue
    const amount = signedAmountForKind(occurrence.amount, kind, scope.transferSide)
    previstoLedger.add(occurrence.forecast.categoryId, occurrence.date, amount)
  }

  return groups
    .filter((group) => scope.kinds.includes(group.kind))
    .map((group) => {
      const rows = categories
        .filter((c) => c.groupId === group.id)
        .map((category) => ({
          label: category.name,
          categoryId: category.id,
          values: realLedger.monthlyMovementsFor(category.id),
          previstoValues: previstoLedger.monthlyMovementsFor(category.id),
        }))
        .filter((row) => row.values.some((v) => v !== 0) || row.previstoValues.some((v) => v !== 0))

      return {
        title: group.name,
        rows: [
          ...rows,
          {
            label: 'Subtotal',
            values: sumRows(rows),
            previstoValues: sumRows(rows.map((r) => ({ values: r.previstoValues }))),
            variant: 'subtotal' as const,
          },
        ],
      }
    })
}

export interface AccountScope {
  groups: Group[]
  categories: Category[]
  scope: SummaryScope
}

interface ResolvedAccountScope {
  kindByCategoryId: KindByCategoryId
  scope: SummaryScope
}

function scopedTransactionAmount(transaction: Transaction, { kindByCategoryId, scope }: ResolvedAccountScope): number {
  return transaction.splits.reduce((sum, split) => {
    const kind = kindByCategoryId.get(split.categoryId)
    if (!kind || !scope.kinds.includes(kind)) return sum
    return sum + signedSplitAmount(transaction, split, kind, scope.transferSide)
  }, 0)
}

function scopedOccurrenceAmount(
  occurrence: ForecastOccurrence,
  { kindByCategoryId, scope }: ResolvedAccountScope,
): number | undefined {
  const kind = kindByCategoryId.get(occurrence.forecast.categoryId)
  if (!kind || !scope.kinds.includes(kind)) return undefined
  return signedAmountForKind(occurrence.amount, kind, scope.transferSide)
}

export function buildAccountSections(
  transactions: Transaction[],
  forecasts: Forecast[],
  accounts: Account[],
  year: number,
  accountScope?: AccountScope,
): SummarySection[] {
  const realLedger = createBalanceLedger(year)
  const previstoLedger = createBalanceLedger(year)
  const resolvedScope: ResolvedAccountScope | undefined = accountScope && {
    kindByCategoryId: buildKindByCategoryId(accountScope.groups, accountScope.categories),
    scope: accountScope.scope,
  }

  for (const transaction of transactions) {
    if (!countsTowardBalance(transaction.date, year)) continue
    const key = transaction.accountId ?? UNASSIGNED_ACCOUNT_ID
    const amount = resolvedScope ? scopedTransactionAmount(transaction, resolvedScope) : transaction.amount
    realLedger.add(key, transaction.date, amount)
    previstoLedger.add(key, transaction.date, amount)
  }

  for (const occurrence of occurrencesForYear(forecasts, year)) {
    if (occurrence.status !== 'pendente') continue
    const amount = resolvedScope ? scopedOccurrenceAmount(occurrence, resolvedScope) : occurrence.amount
    if (amount === undefined) continue
    const key = occurrence.forecast.accountId ?? UNASSIGNED_ACCOUNT_ID
    previstoLedger.add(key, occurrence.date, amount)
  }

  const rows = accounts
    .map((account) => ({
      label: account.name,
      values: realLedger.balancesFor(account.id),
      previstoValues: previstoLedger.balancesFor(account.id),
    }))
    .filter((row) => row.values.some((v) => v !== 0) || row.previstoValues.some((v) => v !== 0))

  const unassignedReal = realLedger.balancesFor(UNASSIGNED_ACCOUNT_ID)
  const unassignedPrevisto = previstoLedger.balancesFor(UNASSIGNED_ACCOUNT_ID)
  if (unassignedReal.some((v) => v !== 0) || unassignedPrevisto.some((v) => v !== 0)) {
    rows.push({ label: UNASSIGNED_ACCOUNT_NAME, values: unassignedReal, previstoValues: unassignedPrevisto })
  }

  return [
    {
      title: 'Por conta',
      rows: [
        ...rows,
        {
          label: 'Total',
          values: sumRows(rows),
          previstoValues: sumRows(rows.map((r) => ({ values: r.previstoValues }))),
          variant: 'subtotal' as const,
        },
      ],
    },
  ]
}
