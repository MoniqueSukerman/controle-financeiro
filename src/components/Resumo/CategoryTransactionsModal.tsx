import { useEffect, useMemo, useState } from 'react'
import { months } from '../../data/months'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../../data/accounts'
import { useAccounts, useCategories, useTransactions } from '../../context/AppDataContext'
import { collectCategoryEntries } from '../../utils/summary'
import type { CategoryEntry, SummaryScope } from '../../utils/summary'
import { formatCurrency, formatDate } from '../../utils/format'
import { SplitEditor } from '../Extrato/SplitEditor'

interface CategoryTransactionsModalProps {
  categoryId: string
  scope: SummaryScope
  year: number
  monthIndex: number
  onClose: () => void
}

function amountClass(value: number) {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-zero'
}

function formatTsvNumber(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

function sanitizeTsvCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim()
}

function buildEntriesTsv(entries: CategoryEntry[], accountNameOf: (entry: CategoryEntry) => string, total: number): string {
  const header = ['Data', 'Descrição', 'Conta', 'Valor', 'Total da transação']
  const rows = entries.map(({ transaction, amount }) => [
    formatDate(transaction.date),
    sanitizeTsvCell(transaction.description),
    sanitizeTsvCell(accountNameOf({ transaction, amount })),
    formatTsvNumber(amount),
    formatTsvNumber(transaction.amount),
  ])
  const totalRow = ['Total', '', '', formatTsvNumber(total), '']
  return [header, ...rows, totalRow].map((cells) => cells.join('\t')).join('\n')
}

export function CategoryTransactionsModal({ categoryId, scope, year, monthIndex, onClose }: CategoryTransactionsModalProps) {
  const { transactions, updateSplits, updateDate, updateAccount } = useTransactions()
  const { categoryById, groupById, categoryKind } = useCategories()
  const { accounts, accountById } = useAccounts()

  const [copied, setCopied] = useState(false)
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null)

  const category = categoryById.get(categoryId)
  const group = category ? groupById.get(category.groupId) : undefined

  function accountNameOf({ transaction }: CategoryEntry): string {
    if (!transaction.accountId) return UNASSIGNED_ACCOUNT_NAME
    return accountById.get(transaction.accountId)?.name ?? UNASSIGNED_ACCOUNT_NAME
  }

  const entries = useMemo(
    () => collectCategoryEntries(transactions, categoryId, categoryKind(categoryId), scope, year, monthIndex),
    [transactions, categoryId, categoryKind, scope, year, monthIndex],
  )

  const total = useMemo(() => entries.reduce((sum, entry) => sum + entry.amount, 0), [entries])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyAsTsv() {
    await navigator.clipboard.writeText(buildEntriesTsv(entries, accountNameOf, total))
    setCopied(true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            {group && <span className="modal__eyebrow">{group.name}</span>}
            <h2 id="category-modal-title" className="modal__title">
              {category?.name ?? categoryId}
            </h2>
            <p className="modal__subtitle">
              {months[monthIndex]}/{year} · {entries.length}{' '}
              {entries.length === 1 ? 'transação' : 'transações'}
            </p>
          </div>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={copyAsTsv}
              disabled={entries.length === 0}
              aria-live="polite"
            >
              {copied ? 'Copiado!' : 'Copiar TSV'}
            </button>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
              ×
            </button>
          </div>
        </header>

        <div className="modal__body">
          {entries.length === 0 ? (
            <p className="modal__empty">Nenhuma transação nesta categoria no mês selecionado.</p>
          ) : (
            <ul className="modal-entries">
              {entries.map(({ transaction, amount }) => {
                const isSplit = transaction.splits.length > 1
                const accountName = accountNameOf({ transaction, amount })
                const isOpen = openTransactionId === transaction.id
                return (
                  <li className="modal-entry" key={transaction.id}>
                    <button
                      type="button"
                      className="modal-entry__row"
                      onClick={() => setOpenTransactionId(isOpen ? null : transaction.id)}
                    >
                      <span className="modal-entry__date">{formatDate(transaction.date)}</span>
                      <span className="modal-entry__main">
                        <span className="modal-entry__description">{transaction.description}</span>
                        <span className="modal-entry__meta">
                          <span className="badge">{accountName}</span>
                          {isSplit && (
                            <span className="badge badge--split">parte de {formatCurrency(transaction.amount)}</span>
                          )}
                        </span>
                      </span>
                      <span className={`modal-entry__amount ${amountClass(amount)}`}>{formatCurrency(amount)}</span>
                    </button>

                    {isOpen && (
                      <div className="modal-entry__expanded">
                        <div className="transaction__date-field">
                          <label htmlFor={`modal-date-${transaction.id}`}>Data</label>
                          <input
                            id={`modal-date-${transaction.id}`}
                            type="date"
                            value={transaction.date}
                            onChange={(e) => updateDate(transaction.id, e.target.value)}
                          />
                        </div>
                        <div className="transaction__account-field">
                          <label htmlFor={`modal-account-${transaction.id}`}>Conta</label>
                          <select
                            id={`modal-account-${transaction.id}`}
                            value={transaction.accountId ?? UNASSIGNED_ACCOUNT_ID}
                            onChange={(e) => updateAccount(transaction.id, e.target.value)}
                          >
                            {accounts.map((account) => (
                              <option value={account.id} key={account.id}>
                                {account.name}
                              </option>
                            ))}
                            <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
                          </select>
                        </div>
                        <SplitEditor
                          totalAmount={transaction.amount}
                          initialSplits={transaction.splits}
                          onSave={(splits) => {
                            updateSplits(transaction.id, splits)
                            setOpenTransactionId(null)
                          }}
                          onCancel={() => setOpenTransactionId(null)}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="modal__footer">
          <span>Total</span>
          <span className={`modal__total ${amountClass(total)}`}>{formatCurrency(total)}</span>
        </footer>
      </div>
    </div>
  )
}
