import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Account,
  Category,
  CategoryKind,
  CreditCard,
  Forecast,
  ForecastOverride,
  ForecastRecurrence,
  Group,
  ImportBatch,
  Split,
  Transaction,
} from '../data/types'
import { initialGroups } from '../data/groups'
import { initialCategories } from '../data/categories'
import { initialAccounts, UNASSIGNED_ACCOUNT_ID } from '../data/accounts'
import { transactions as seedTransactions } from '../data/transactions'
import { forecasts as seedForecasts } from '../data/forecasts'
import { creditCards as seedCreditCards } from '../data/creditCards'
import { useBackupFolder } from '../persistence/useBackupFolder'
import type { BackupStatus } from '../persistence/useBackupFolder'
import { useGoogleDriveBackup } from '../persistence/useGoogleDriveBackup'
import type { DriveBackupStatus } from '../persistence/useGoogleDriveBackup'
import { coveredDaysForAccount, partitionByCoveredDays } from '../utils/importCoverage'
import type { ImportInput, ImportResult } from '../utils/importCoverage'

const STORAGE_KEY = 'controle-financeiro.data.v1'
const SAVE_DEBOUNCE_MS = 800

function normalizeAccountId(accountId: string): string | undefined {
  return accountId === UNASSIGNED_ACCOUNT_ID ? undefined : accountId
}

interface StoredData {
  groups: Group[]
  categories: Category[]
  accounts: Account[]
  transactions: Transaction[]
  importBatches: ImportBatch[]
  forecasts: Forecast[]
  creditCards: CreditCard[]
}

function isStoredDataShape(data: unknown): data is Partial<StoredData> {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  const isArrayOrUndefined = (v: unknown) => v === undefined || Array.isArray(v)
  return (
    isArrayOrUndefined(d.groups) &&
    isArrayOrUndefined(d.categories) &&
    isArrayOrUndefined(d.accounts) &&
    isArrayOrUndefined(d.transactions) &&
    isArrayOrUndefined(d.importBatches) &&
    isArrayOrUndefined(d.forecasts) &&
    isArrayOrUndefined(d.creditCards)
  )
}

function migrateForecastSettledBy(forecasts: Forecast[]): Forecast[] {
  return forecasts.map((f) => ({
    ...f,
    settledBy: Object.fromEntries(
      Object.entries(f.settledBy ?? {}).map(([month, value]) => [month, Array.isArray(value) ? value : [value]]),
    ),
  }))
}

function loadInitialData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('no stored data')
    const parsed = JSON.parse(raw)
    return {
      groups: parsed.groups ?? initialGroups,
      categories: parsed.categories ?? initialCategories,
      accounts: parsed.accounts ?? initialAccounts,
      transactions: parsed.transactions ?? seedTransactions,
      importBatches: parsed.importBatches ?? [],
      forecasts: migrateForecastSettledBy(parsed.forecasts ?? seedForecasts),
      creditCards: parsed.creditCards ?? seedCreditCards,
    }
  } catch {
    return {
      groups: initialGroups,
      categories: initialCategories,
      accounts: initialAccounts,
      transactions: seedTransactions,
      importBatches: [],
      forecasts: seedForecasts,
      creditCards: seedCreditCards,
    }
  }
}

interface BackupInfo {
  supported: boolean
  status: BackupStatus
  folderName: string | null
  lastSavedAt: string | null
  connect: () => Promise<void>
  reconnect: () => Promise<void>
  disconnect: () => Promise<void>
}

interface DriveBackupInfo {
  status: DriveBackupStatus
  lastSyncedAt: string | null
  remoteModifiedTime: string | null
  connect: () => Promise<void>
  disconnect: () => void
  loadRemoteBackup: () => Promise<void>
  keepLocal: () => void
}

interface ForecastInput {
  description: string
  amount: number
  categoryId: string
  accountId?: string
  recurrence: ForecastRecurrence
  startMonth: string
  endMonth?: string
}

interface CreditCardInput {
  accountId: string
  limit: number
  closingDay: number
  dueDay: number
  paymentAccountId?: string
}

interface AppDataContextValue {
  groups: Group[]
  categories: Category[]
  accounts: Account[]
  transactions: Transaction[]
  importBatches: ImportBatch[]
  forecasts: Forecast[]
  creditCards: CreditCard[]
  categoryById: Map<string, Category>
  groupById: Map<string, Group>
  accountById: Map<string, Account>
  categoryKind: (categoryId: string) => CategoryKind | undefined
  categoriesByGroup: (groupId: string) => Category[]
  addGroup: (name: string, kind: CategoryKind) => void
  renameGroup: (id: string, name: string) => void
  removeGroup: (id: string) => void
  reorderGroup: (draggedId: string, targetId: string, scopeKinds: CategoryKind[]) => void
  addCategory: (groupId: string, name: string) => string
  renameCategory: (id: string, name: string) => void
  removeCategory: (id: string) => void
  reorderCategory: (draggedId: string, targetId: string) => void
  addAccount: (name: string) => void
  renameAccount: (id: string, name: string) => void
  removeAccount: (id: string) => void
  reorderAccount: (draggedId: string, targetId: string) => void
  updateTransactionSplits: (id: string, splits: Split[]) => void
  updateTransactionDate: (id: string, date: string) => void
  updateTransactionAccount: (id: string, accountId: string) => void
  updateTransactionsAccount: (ids: string[], accountId: string) => void
  addTransaction: (input: { date: string; description: string; amount: number; categoryId: string; accountId: string }) => void
  importTransactions: (input: ImportInput) => ImportResult
  reassignImportBatchAccount: (batchId: string, accountId: string) => void
  removeImportBatch: (batchId: string) => void
  removeTransactions: (ids: string[]) => void
  addForecast: (input: ForecastInput) => void
  updateForecast: (id: string, patch: Partial<ForecastInput>) => void
  removeForecast: (id: string) => void
  settleForecastMonth: (id: string, month: string, transactionId: string) => void
  unsettleForecastMonth: (id: string, month: string, transactionId: string) => void
  skipForecastMonth: (id: string, month: string) => void
  unskipForecastMonth: (id: string, month: string) => void
  overrideForecastMonth: (id: string, month: string, override: ForecastOverride) => void
  endForecastRecurrence: (id: string, lastMonth: string) => void
  addCreditCard: (input: CreditCardInput) => void
  updateCreditCard: (id: string, patch: Partial<CreditCardInput>) => void
  removeCreditCard: (id: string) => void
  settleInvoicePayment: (id: string, month: string, transactionId: string) => void
  unsettleInvoicePayment: (id: string, month: string, transactionId: string) => void
  restoreFromJson: (data: unknown) => { ok: boolean; error?: string }
  mergeFromJson: (data: unknown) => {
    ok: boolean
    error?: string
    added?: {
      groups: number
      categories: number
      accounts: number
      transactions: number
      importBatches: number
      forecasts: number
      creditCards: number
    }
  }
  backup: BackupInfo
  driveBackup: DriveBackupInfo
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function generateId(prefix: string) {
  const unique =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${unique}`
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadInitialData()).current
  const [groups, setGroups] = useState<Group[]>(initial.groups)
  const [categories, setCategories] = useState<Category[]>(initial.categories)
  const [accounts, setAccounts] = useState<Account[]>(initial.accounts)
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions)
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(initial.importBatches)
  const [forecasts, setForecasts] = useState<Forecast[]>(initial.forecasts)
  const [creditCards, setCreditCards] = useState<CreditCard[]>(initial.creditCards)

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const getPayload = () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    groups,
    categories,
    accounts,
    transactions,
    importBatches,
    forecasts,
    creditCards,
  })

  const { writeBackup: writeFolderBackup, ...backup } = useBackupFolder(getPayload)
  const { writeBackup: writeDriveBackup, loadRemote, keepLocal, ...driveRest } = useGoogleDriveBackup(getPayload)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ groups, categories, accounts, transactions, importBatches, forecasts, creditCards }),
    )

    const timeouts: number[] = []
    if (backup.status === 'connected' || backup.status === 'saving') {
      timeouts.push(window.setTimeout(() => writeFolderBackup(), SAVE_DEBOUNCE_MS))
    }
    if (driveRest.status === 'connected' || driveRest.status === 'syncing') {
      timeouts.push(window.setTimeout(() => writeDriveBackup(), SAVE_DEBOUNCE_MS))
    }
    return () => timeouts.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, categories, accounts, transactions, importBatches, forecasts, creditCards])

  function applyRestoredData(data: unknown) {
    if (typeof data !== 'object' || data === null) return
    const parsed = data as Partial<StoredData>
    if (parsed.groups) setGroups(parsed.groups)
    if (parsed.categories) setCategories(parsed.categories)
    if (parsed.accounts) setAccounts(parsed.accounts)
    if (parsed.transactions) setTransactions(parsed.transactions)
    if (parsed.importBatches) setImportBatches(parsed.importBatches)
    if (parsed.forecasts) setForecasts(migrateForecastSettledBy(parsed.forecasts))
    if (parsed.creditCards) setCreditCards(parsed.creditCards)
  }

  function restoreFromJson(data: unknown): { ok: boolean; error?: string } {
    if (!isStoredDataShape(data)) {
      return { ok: false, error: 'Arquivo não parece um backup válido.' }
    }
    applyRestoredData(data)
    return { ok: true }
  }

  function mergeFromJson(data: unknown): {
    ok: boolean
    error?: string
    added?: {
      groups: number
      categories: number
      accounts: number
      transactions: number
      importBatches: number
      forecasts: number
      creditCards: number
    }
  } {
    if (!isStoredDataShape(data)) {
      return { ok: false, error: 'Arquivo não parece um backup válido.' }
    }
    const parsed = data as Partial<StoredData>
    const added = { groups: 0, categories: 0, accounts: 0, transactions: 0, importBatches: 0, forecasts: 0, creditCards: 0 }

    if (parsed.groups) {
      setGroups((prev) => {
        const existingIds = new Set(prev.map((g) => g.id))
        const toAdd = parsed.groups!.filter((g) => !existingIds.has(g.id))
        added.groups = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.categories) {
      setCategories((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        const toAdd = parsed.categories!.filter((c) => !existingIds.has(c.id))
        added.categories = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.accounts) {
      setAccounts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const toAdd = parsed.accounts!.filter((a) => !existingIds.has(a.id))
        added.accounts = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.transactions) {
      setTransactions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id))
        const toAdd = parsed.transactions!.filter((t) => !existingIds.has(t.id))
        added.transactions = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.importBatches) {
      setImportBatches((prev) => {
        const existingIds = new Set(prev.map((b) => b.id))
        const toAdd = parsed.importBatches!.filter((b) => !existingIds.has(b.id))
        added.importBatches = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.forecasts) {
      setForecasts((prev) => {
        const existingIds = new Set(prev.map((f) => f.id))
        const toAdd = migrateForecastSettledBy(parsed.forecasts!.filter((f) => !existingIds.has(f.id)))
        added.forecasts = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }
    if (parsed.creditCards) {
      setCreditCards((prev) => {
        const existingIds = new Set(prev.map((c) => c.id))
        const toAdd = parsed.creditCards!.filter((c) => !existingIds.has(c.id))
        added.creditCards = toAdd.length
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })
    }

    return { ok: true, added }
  }

  async function loadRemoteBackup() {
    const data = await loadRemote()
    if (data) applyRestoredData(data)
    keepLocal()
  }

  const driveBackup: DriveBackupInfo = { ...driveRest, loadRemoteBackup, keepLocal }

  function categoryKind(categoryId: string) {
    const category = categoryById.get(categoryId)
    if (!category) return undefined
    return groupById.get(category.groupId)?.kind
  }

  function categoriesByGroup(groupId: string) {
    return categories.filter((c) => c.groupId === groupId)
  }

  function addGroup(name: string, kind: CategoryKind) {
    setGroups((prev) => [...prev, { id: generateId('group'), name, kind }])
  }

  function renameGroup(id: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)))
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
    setCategories((prev) => prev.filter((c) => c.groupId !== id))
  }

  function reorderGroup(draggedId: string, targetId: string, scopeKinds: CategoryKind[]) {
    if (draggedId === targetId) return
    setGroups((prev) => {
      const siblings = prev.filter((g) => scopeKinds.includes(g.kind))
      const fromIndex = siblings.findIndex((g) => g.id === draggedId)
      const toIndex = siblings.findIndex((g) => g.id === targetId)
      if (fromIndex < 0 || toIndex < 0) return prev
      const reordered = [...siblings]
      const [dragged] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, dragged)
      let i = 0
      return prev.map((g) => (scopeKinds.includes(g.kind) ? reordered[i++] : g))
    })
  }

  function addCategory(groupId: string, name: string) {
    const id = generateId('cat')
    setCategories((prev) => [...prev, { id, name, groupId }])
    return id
  }

  function renameCategory(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }

  function removeCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  function reorderCategory(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    setCategories((prev) => {
      const dragged = prev.find((c) => c.id === draggedId)
      const target = prev.find((c) => c.id === targetId)
      if (!dragged || !target || dragged.groupId !== target.groupId) return prev
      const siblings = prev.filter((c) => c.groupId === dragged.groupId)
      const fromIndex = siblings.findIndex((c) => c.id === draggedId)
      const toIndex = siblings.findIndex((c) => c.id === targetId)
      const reordered = [...siblings]
      const [removed] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, removed)
      let i = 0
      return prev.map((c) => (c.groupId === dragged.groupId ? reordered[i++] : c))
    })
  }

  function addAccount(name: string) {
    setAccounts((prev) => [...prev, { id: generateId('account'), name }])
  }

  function renameAccount(id: string, name: string) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)))
  }

  function removeAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setTransactions((prev) => prev.map((t) => (t.accountId === id ? { ...t, accountId: undefined } : t)))
  }

  function reorderAccount(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    setAccounts((prev) => {
      const fromIndex = prev.findIndex((a) => a.id === draggedId)
      const toIndex = prev.findIndex((a) => a.id === targetId)
      if (fromIndex < 0 || toIndex < 0) return prev
      const copy = [...prev]
      const [dragged] = copy.splice(fromIndex, 1)
      copy.splice(toIndex, 0, dragged)
      return copy
    })
  }

  function updateTransactionSplits(id: string, splits: Split[]) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, splits } : t)))
  }

  function updateTransactionDate(id: string, date: string) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, date } : t)))
  }

  function updateTransactionAccount(id: string, accountId: string) {
    const normalized = normalizeAccountId(accountId)
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, accountId: normalized } : t)))
  }

  function updateTransactionsAccount(ids: string[], accountId: string) {
    const normalized = normalizeAccountId(accountId)
    const idSet = new Set(ids)
    setTransactions((prev) => prev.map((t) => (idSet.has(t.id) ? { ...t, accountId: normalized } : t)))
  }

  function addTransaction(input: { date: string; description: string; amount: number; categoryId: string; accountId: string }) {
    setTransactions((prev) => [
      ...prev,
      {
        id: generateId('t'),
        date: input.date,
        description: input.description,
        amount: input.amount,
        accountId: input.accountId,
        splits: [{ categoryId: input.categoryId, amount: Math.abs(input.amount) }],
      },
    ])
  }

  function importTransactions(input: ImportInput): ImportResult {
    const coveredDays = coveredDaysForAccount(input.accountId, importBatches, transactions)
    const { toImport, importedDays, skippedDays } = partitionByCoveredDays(input.entries, coveredDays)
    const result: ImportResult = {
      imported: toImport.length,
      skipped: input.entries.length - toImport.length,
      importedDays,
      skippedDays,
    }
    if (toImport.length === 0) return result

    const newTransactions: Transaction[] = toImport.map((entry) => ({
      id: generateId('ofx'),
      date: entry.date,
      description: entry.description,
      amount: entry.amount,
      accountId: input.accountId,
      splits: [{ categoryId: input.categoryId, amount: Math.abs(entry.amount) }],
    }))

    setTransactions((prev) => [...prev, ...newTransactions])
    setImportBatches((prev) => [
      ...prev,
      {
        id: generateId('batch'),
        fileName: input.fileName,
        importedAt: new Date().toISOString(),
        accountId: input.accountId,
        coveredDays: importedDays,
        transactionIds: newTransactions.map((transaction) => transaction.id),
      },
    ])

    return result
  }

  function removeImportBatch(batchId: string) {
    const batch = importBatches.find((b) => b.id === batchId)
    if (!batch) return
    const idsToRemove = new Set(batch.transactionIds)
    setTransactions((prev) => prev.filter((t) => !idsToRemove.has(t.id)))
    setImportBatches((prev) => prev.filter((b) => b.id !== batchId))
  }

  function reassignImportBatchAccount(batchId: string, accountId: string) {
    const batch = importBatches.find((b) => b.id === batchId)
    if (!batch) return
    const normalized = normalizeAccountId(accountId)
    const idsToUpdate = new Set(batch.transactionIds)
    setTransactions((prev) => prev.map((t) => (idsToUpdate.has(t.id) ? { ...t, accountId: normalized } : t)))
    setImportBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, accountId: normalized } : b)))
  }

  function removeTransactions(ids: string[]) {
    const idSet = new Set(ids)
    setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)))
    setImportBatches((prev) =>
      prev
        .map((b) => ({ ...b, transactionIds: b.transactionIds.filter((id) => !idSet.has(id)) }))
        .filter((b) => b.transactionIds.length > 0),
    )
  }

  function addForecast(input: ForecastInput) {
    setForecasts((prev) => [
      ...prev,
      {
        id: generateId('forecast'),
        description: input.description,
        amount: input.amount,
        categoryId: input.categoryId,
        accountId: input.accountId,
        recurrence: input.recurrence,
        startMonth: input.startMonth,
        endMonth: input.endMonth,
        skippedMonths: [],
        overrides: {},
        settledBy: {},
      },
    ])
  }

  function updateForecast(id: string, patch: Partial<ForecastInput>) {
    setForecasts((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function removeForecast(id: string) {
    setForecasts((prev) => prev.filter((f) => f.id !== id))
  }

  function settleForecastMonth(id: string, month: string, transactionId: string) {
    setForecasts((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const existing = f.settledBy[month] ?? []
        if (existing.includes(transactionId)) return f
        return { ...f, settledBy: { ...f.settledBy, [month]: [...existing, transactionId] } }
      }),
    )
  }

  function unsettleForecastMonth(id: string, month: string, transactionId: string) {
    setForecasts((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const remaining = (f.settledBy[month] ?? []).filter((t) => t !== transactionId)
        const settledBy = { ...f.settledBy }
        if (remaining.length > 0) settledBy[month] = remaining
        else delete settledBy[month]
        return { ...f, settledBy }
      }),
    )
  }

  function skipForecastMonth(id: string, month: string) {
    setForecasts((prev) =>
      prev.map((f) => (f.id === id && !f.skippedMonths.includes(month) ? { ...f, skippedMonths: [...f.skippedMonths, month] } : f)),
    )
  }

  function unskipForecastMonth(id: string, month: string) {
    setForecasts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, skippedMonths: f.skippedMonths.filter((m) => m !== month) } : f)),
    )
  }

  function overrideForecastMonth(id: string, month: string, override: ForecastOverride) {
    setForecasts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, overrides: { ...f.overrides, [month]: override } } : f)),
    )
  }

  function endForecastRecurrence(id: string, lastMonth: string) {
    setForecasts((prev) => prev.map((f) => (f.id === id ? { ...f, endMonth: lastMonth } : f)))
  }

  function addCreditCard(input: CreditCardInput) {
    setCreditCards((prev) => [
      ...prev,
      {
        id: generateId('card'),
        accountId: input.accountId,
        limit: input.limit,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        paymentAccountId: input.paymentAccountId,
        paidBy: {},
      },
    ])
  }

  function updateCreditCard(id: string, patch: Partial<CreditCardInput>) {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeCreditCard(id: string) {
    setCreditCards((prev) => prev.filter((c) => c.id !== id))
  }

  function settleInvoicePayment(id: string, month: string, transactionId: string) {
    setCreditCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const existing = c.paidBy[month] ?? []
        if (existing.includes(transactionId)) return c
        return { ...c, paidBy: { ...c.paidBy, [month]: [...existing, transactionId] } }
      }),
    )
  }

  function unsettleInvoicePayment(id: string, month: string, transactionId: string) {
    setCreditCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const remaining = (c.paidBy[month] ?? []).filter((t) => t !== transactionId)
        const paidBy = { ...c.paidBy }
        if (remaining.length > 0) paidBy[month] = remaining
        else delete paidBy[month]
        return { ...c, paidBy }
      }),
    )
  }

  const value: AppDataContextValue = {
    groups,
    categories,
    accounts,
    transactions,
    importBatches,
    forecasts,
    creditCards,
    categoryById,
    groupById,
    accountById,
    categoryKind,
    categoriesByGroup,
    addGroup,
    renameGroup,
    removeGroup,
    reorderGroup,
    addCategory,
    renameCategory,
    removeCategory,
    reorderCategory,
    addAccount,
    renameAccount,
    removeAccount,
    reorderAccount,
    updateTransactionSplits,
    updateTransactionDate,
    updateTransactionAccount,
    updateTransactionsAccount,
    addTransaction,
    importTransactions,
    reassignImportBatchAccount,
    removeImportBatch,
    removeTransactions,
    addForecast,
    updateForecast,
    removeForecast,
    settleForecastMonth,
    unsettleForecastMonth,
    skipForecastMonth,
    unskipForecastMonth,
    overrideForecastMonth,
    endForecastRecurrence,
    restoreFromJson,
    mergeFromJson,
    backup,
    driveBackup,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('must be used within AppDataProvider')
  return ctx
}

export function useCategories() {
  const ctx = useAppData()
  return {
    groups: ctx.groups,
    categories: ctx.categories,
    categoryById: ctx.categoryById,
    groupById: ctx.groupById,
    categoryKind: ctx.categoryKind,
    categoriesByGroup: ctx.categoriesByGroup,
    addGroup: ctx.addGroup,
    renameGroup: ctx.renameGroup,
    removeGroup: ctx.removeGroup,
    reorderGroup: ctx.reorderGroup,
    addCategory: ctx.addCategory,
    renameCategory: ctx.renameCategory,
    removeCategory: ctx.removeCategory,
    reorderCategory: ctx.reorderCategory,
  }
}

export function useAccounts() {
  const ctx = useAppData()
  return {
    accounts: ctx.accounts,
    accountById: ctx.accountById,
    addAccount: ctx.addAccount,
    renameAccount: ctx.renameAccount,
    removeAccount: ctx.removeAccount,
    reorderAccount: ctx.reorderAccount,
  }
}

export function useForecasts() {
  const ctx = useAppData()
  return {
    forecasts: ctx.forecasts,
    addForecast: ctx.addForecast,
    updateForecast: ctx.updateForecast,
    removeForecast: ctx.removeForecast,
    settleForecastMonth: ctx.settleForecastMonth,
    unsettleForecastMonth: ctx.unsettleForecastMonth,
    skipForecastMonth: ctx.skipForecastMonth,
    unskipForecastMonth: ctx.unskipForecastMonth,
    overrideForecastMonth: ctx.overrideForecastMonth,
    endForecastRecurrence: ctx.endForecastRecurrence,
  }
}

export function useTransactions() {
  const ctx = useAppData()
  return {
    transactions: ctx.transactions,
    importBatches: ctx.importBatches,
    updateSplits: ctx.updateTransactionSplits,
    updateDate: ctx.updateTransactionDate,
    updateAccount: ctx.updateTransactionAccount,
    updateAccountBulk: ctx.updateTransactionsAccount,
    addTransaction: ctx.addTransaction,
    importTransactions: ctx.importTransactions,
    reassignImportBatchAccount: ctx.reassignImportBatchAccount,
    removeImportBatch: ctx.removeImportBatch,
    removeTransactions: ctx.removeTransactions,
    restoreFromJson: ctx.restoreFromJson,
    mergeFromJson: ctx.mergeFromJson,
  }
}

export function useBackup() {
  const ctx = useAppData()
  return ctx.backup
}

export function useDriveBackup() {
  const ctx = useAppData()
  return ctx.driveBackup
}
