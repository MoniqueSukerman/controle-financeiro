import { useMemo, useState } from 'react'
import { openingBalance } from '../../data/transactions'
import { UNCATEGORIZED_CATEGORY_ID } from '../../data/categories'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../../data/accounts'
import type { Split, Transaction } from '../../data/types'
import { useAccounts, useTransactions } from '../../context/AppDataContext'
import { formatCurrency } from '../../utils/format'
import { getAvailableYears, monthOf, yearOf } from '../../utils/period'
import { months } from '../../data/months'
import { MonthSelector } from '../MonthSelector'
import { YearSelector } from '../YearSelector'
import { TransactionRow } from './TransactionRow'
import { TransactionForm } from './TransactionForm'

type StatusTab = 'categorizado' | 'nao-categorizado'

const ALL_ACCOUNTS_FILTER = 'todas'

interface ExtratoPageProps {
  monthIndex: number
  year: number
  onMonthChange: (index: number) => void
  onYearChange: (year: number) => void
}

function isUncategorized(transaction: Transaction): boolean {
  return transaction.splits.some((s) => s.categoryId === UNCATEGORIZED_CATEGORY_ID)
}

function periodKey(dateIso: string): number {
  return yearOf(dateIso) * 12 + monthOf(dateIso)
}

function belongsToAccount(transaction: Transaction, accountFilter: string): boolean {
  if (accountFilter === ALL_ACCOUNTS_FILTER) return true
  return (transaction.accountId ?? UNASSIGNED_ACCOUNT_ID) === accountFilter
}

export function ExtratoPage({ monthIndex, year, onMonthChange, onYearChange }: ExtratoPageProps) {
  const {
    transactions,
    updateSplits,
    updateDate,
    updateAccount,
    updateAccountBulk,
    addTransaction,
    removeTransactions,
  } = useTransactions()
  const { accounts, accountById } = useAccounts()
  const [openId, setOpenId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [statusTab, setStatusTab] = useState<StatusTab>('categorizado')
  const [accountFilter, setAccountFilter] = useState<string>(ALL_ACCOUNTS_FILTER)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const years = useMemo(() => getAvailableYears(transactions, year), [transactions, year])
  const selectedPeriodKey = year * 12 + monthIndex

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => belongsToAccount(t, accountFilter)),
    [transactions, accountFilter],
  )

  const rows = useMemo(() => {
    const chronological = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date))
    let running = openingBalance
    const withBalance = chronological.map((t) => {
      running += t.amount
      return { transaction: t, balance: running }
    })
    return withBalance.reverse()
  }, [filteredTransactions])

  const periodRows = useMemo(
    () => rows.filter((r) => periodKey(r.transaction.date) === selectedPeriodKey),
    [rows, selectedPeriodKey],
  )

  const totals = useMemo(() => {
    const periodTransactions = filteredTransactions.filter((t) => periodKey(t.date) === selectedPeriodKey)
    const entradas = periodTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const saidas = periodTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    const saldoRow = rows.find((r) => periodKey(r.transaction.date) <= selectedPeriodKey)
    return { entradas, saidas, saldo: saldoRow?.balance ?? openingBalance }
  }, [filteredTransactions, rows, selectedPeriodKey])

  const categorizedRows = useMemo(() => periodRows.filter((r) => !isUncategorized(r.transaction)), [periodRows])
  const uncategorizedRows = useMemo(() => periodRows.filter((r) => isUncategorized(r.transaction)), [periodRows])
  const visibleRows = statusTab === 'categorizado' ? categorizedRows : uncategorizedRows
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.transaction.id))

  const accountGroups = useMemo(() => {
    const byAccount = new Map<string, typeof visibleRows>()
    for (const row of visibleRows) {
      const accountId = row.transaction.accountId ?? UNASSIGNED_ACCOUNT_ID
      if (!byAccount.has(accountId)) byAccount.set(accountId, [])
      byAccount.get(accountId)!.push(row)
    }
    const orderedIds = [...accounts.map((a) => a.id), UNASSIGNED_ACCOUNT_ID]
    return orderedIds
      .filter((id) => byAccount.has(id))
      .map((id) => ({
        accountId: id,
        accountName: accountById.get(id)?.name ?? UNASSIGNED_ACCOUNT_NAME,
        rows: byAccount.get(id)!,
      }))
  }, [visibleRows, accounts, accountById])

  function handleSaveSplits(id: string, splits: Split[]) {
    updateSplits(id, splits)
    setOpenId(null)
  }

  function switchTab(tab: StatusTab) {
    setStatusTab(tab)
    setSelectedIds(new Set())
  }

  function changeAccountFilter(nextFilter: string) {
    setAccountFilter(nextFilter)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleRows.forEach((r) => next.delete(r.transaction.id))
      } else {
        visibleRows.forEach((r) => next.add(r.transaction.id))
      }
      return next
    })
  }

  function handleDeleteOne(transaction: Transaction) {
    const ok = window.confirm(`Excluir a transação "${transaction.description}"? Essa ação não pode ser desfeita.`)
    if (!ok) return
    removeTransactions([transaction.id])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(transaction.id)
      return next
    })
  }

  function handleAssignAccountToSelected(accountId: string) {
    if (!accountId) return
    updateAccountBulk(Array.from(selectedIds), accountId)
    setSelectedIds(new Set())
  }

  function handleDeleteSelected() {
    const ok = window.confirm(
      `Excluir ${selectedIds.size} transação(ões) selecionada(s)? Essa ação não pode ser desfeita.`,
    )
    if (!ok) return
    removeTransactions(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  return (
    <div className="extrato">
      <header className="extrato__header">
        <div>
          <h1>Transações</h1>
        </div>
        <div className="extrato__totals">
          <div>
            <span className="label">Entradas</span>
            <span className="value is-positive">{formatCurrency(totals.entradas)}</span>
          </div>
          <div>
            <span className="label">Saídas</span>
            <span className="value is-negative">{formatCurrency(totals.saidas)}</span>
          </div>
          <div>
            <span className="label">Saldo</span>
            <span className="value">{formatCurrency(totals.saldo)}</span>
          </div>
        </div>
      </header>

      <div className="extrato__toolbar">
        <div className="period-selector">
          <YearSelector years={years} selected={year} onSelect={onYearChange} />
          <MonthSelector months={months} selected={monthIndex} onSelect={onMonthChange} />
        </div>

        <div className="extrato__actions">
          <button type="button" className="btn btn--primary" onClick={() => setIsAdding((prev) => !prev)}>
            {isAdding ? 'Cancelar' : '+ Nova transação'}
          </button>
        </div>
      </div>

      {isAdding && (
        <TransactionForm
          onSubmit={(input) => {
            addTransaction(input)
            setIsAdding(false)
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className="extrato__filters">
        <div className="status-tabs">
          <button
            type="button"
            className={statusTab === 'categorizado' ? 'is-active' : ''}
            onClick={() => switchTab('categorizado')}
          >
            Categorizado ({categorizedRows.length})
          </button>
          <button
            type="button"
            className={statusTab === 'nao-categorizado' ? 'is-active' : ''}
            onClick={() => switchTab('nao-categorizado')}
          >
            Não categorizado ({uncategorizedRows.length})
          </button>
        </div>
        <select
          className="account-filter"
          aria-label="Filtrar por conta"
          value={accountFilter}
          onChange={(e) => changeAccountFilter(e.target.value)}
        >
          <option value={ALL_ACCOUNTS_FILTER}>Todas as contas</option>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.name}
            </option>
          ))}
          <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
        </select>
      </div>

      <div className="bulk-actions">
        <label>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAllVisible}
            disabled={visibleRows.length === 0}
          />
          Selecionar todas
        </label>
        {selectedIds.size > 0 && (
          <>
            <span>{selectedIds.size} selecionada(s)</span>
            <select
              className="bulk-actions__account"
              aria-label="Definir conta das selecionadas"
              value=""
              onChange={(e) => handleAssignAccountToSelected(e.target.value)}
            >
              <option value="">Definir conta…</option>
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
              <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
            </select>
            <button type="button" className="btn btn--ghost" onClick={handleDeleteSelected}>
              Excluir selecionadas
            </button>
          </>
        )}
      </div>

      {accountGroups.map((group) => (
        <div className="extrato__account-group" key={group.accountId}>
          <h3 className="monthly-list__title">{group.accountName}</h3>
          <ul className="transaction-list">
            {group.rows.map(({ transaction, balance }) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                balance={balance}
                isOpen={openId === transaction.id}
                selected={selectedIds.has(transaction.id)}
                onToggle={() => setOpenId((prev) => (prev === transaction.id ? null : transaction.id))}
                onToggleSelect={() => toggleSelect(transaction.id)}
                onSaveSplits={(splits) => handleSaveSplits(transaction.id, splits)}
                onUpdateDate={(date) => updateDate(transaction.id, date)}
                onUpdateAccount={(accountId) => updateAccount(transaction.id, accountId)}
                onDelete={() => handleDeleteOne(transaction)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
