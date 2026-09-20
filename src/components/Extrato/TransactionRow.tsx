import type { Transaction, Split } from '../../data/types'
import { useAccounts, useCategories } from '../../context/AppDataContext'
import { UNCATEGORIZED_CATEGORY_ID, UNCATEGORIZED_CATEGORY_NAME } from '../../data/categories'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../../data/accounts'
import { formatCurrency, formatDate } from '../../utils/format'
import { SplitEditor } from './SplitEditor'

interface TransactionRowProps {
  transaction: Transaction
  balance: number
  isOpen: boolean
  selected: boolean
  onToggle: () => void
  onToggleSelect: () => void
  onSaveSplits: (splits: Split[]) => void
  onUpdateDate: (date: string) => void
  onUpdateAccount: (accountId: string) => void
  onDelete: () => void
}

export function TransactionRow({
  transaction,
  balance,
  isOpen,
  selected,
  onToggle,
  onToggleSelect,
  onSaveSplits,
  onUpdateDate,
  onUpdateAccount,
  onDelete,
}: TransactionRowProps) {
  const { categoryById, categoryKind } = useCategories()
  const { accounts } = useAccounts()
  const isSplit = transaction.splits.length > 1
  const isPositive = transaction.amount >= 0

  return (
    <li className={`transaction ${isOpen ? 'is-open' : ''}`}>
      <div className="transaction__row">
        <input
          type="checkbox"
          className="transaction__checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Selecionar transação"
        />

        <button type="button" className="transaction__toggle" onClick={onToggle}>
          <span className="transaction__date">{formatDate(transaction.date)}</span>

          <span className="transaction__main">
            <span className="transaction__description">{transaction.description}</span>
            <span className="transaction__badges">
              {isSplit ? (
                <span className="badge badge--split">{transaction.splits.length} categorias</span>
              ) : transaction.splits[0].categoryId === UNCATEGORIZED_CATEGORY_ID ? (
                <span className="badge badge--uncategorized">{UNCATEGORIZED_CATEGORY_NAME}</span>
              ) : (
                <span className={`badge badge--${categoryKind(transaction.splits[0].categoryId)}`}>
                  {categoryById.get(transaction.splits[0].categoryId)?.name}
                </span>
              )}
            </span>
          </span>

          <span className="transaction__amount-col">
            <span className={`transaction__amount ${isPositive ? 'is-positive' : 'is-negative'}`}>
              {isPositive ? '+' : ''}
              {formatCurrency(transaction.amount)}
            </span>
            <span className="transaction__balance">saldo {formatCurrency(balance)}</span>
          </span>

          <span className={`transaction__chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
            ⌄
          </span>
        </button>

        <button
          type="button"
          className="transaction__delete"
          onClick={onDelete}
          aria-label="Excluir transação"
        >
          ×
        </button>
      </div>

      {isOpen && (
        <div className="transaction__expanded">
          <div className="transaction__date-field">
            <label htmlFor={`date-${transaction.id}`}>Data</label>
            <input
              id={`date-${transaction.id}`}
              type="date"
              value={transaction.date}
              onChange={(e) => onUpdateDate(e.target.value)}
            />
          </div>
          <div className="transaction__account-field">
            <label htmlFor={`account-${transaction.id}`}>Conta</label>
            <select
              id={`account-${transaction.id}`}
              value={transaction.accountId ?? UNASSIGNED_ACCOUNT_ID}
              onChange={(e) => onUpdateAccount(e.target.value)}
            >
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
              <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
            </select>
          </div>
          {isSplit && (
            <ul className="transaction__split-summary">
              {transaction.splits.map((split, i) => (
                <li key={i}>
                  <span>{categoryById.get(split.categoryId)?.name}</span>
                  <span>{formatCurrency(split.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <SplitEditor
            totalAmount={transaction.amount}
            initialSplits={transaction.splits}
            onSave={onSaveSplits}
            onCancel={onToggle}
          />
        </div>
      )}
    </li>
  )
}
