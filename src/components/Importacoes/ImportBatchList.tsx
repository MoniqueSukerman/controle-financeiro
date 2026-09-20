import type { Account, ImportBatch } from '../../data/types'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../../data/accounts'
import { formatDate, formatDateTime } from '../../utils/format'

interface ImportBatchListProps {
  batches: ImportBatch[]
  accounts: Account[]
  accountById: Map<string, Account>
  onRemove: (id: string) => void
  onReassignAccount: (batchId: string, accountId: string) => void
}

function describeCoveredPeriod(coveredDays: string[] | undefined): string | null {
  if (!coveredDays || coveredDays.length === 0) return null
  const sorted = [...coveredDays].sort()
  const first = formatDate(sorted[0])
  const last = formatDate(sorted[sorted.length - 1])
  const range = first === last ? first : `${first} a ${last}`
  return `${range} (${sorted.length} ${sorted.length === 1 ? 'dia' : 'dias'})`
}

export function ImportBatchList({ batches, accounts, accountById, onRemove, onReassignAccount }: ImportBatchListProps) {
  if (batches.length === 0) return null

  function handleRemove(batch: ImportBatch) {
    const ok = window.confirm(
      `Excluir o import "${batch.fileName}" e suas ${batch.transactionIds.length} transação(ões)? Os dias cobertos por ele voltam a poder ser importados. Essa ação não pode ser desfeita.`,
    )
    if (ok) onRemove(batch.id)
  }

  return (
    <div className="import-batches">
      <h3 className="import-batches__title">Lotes importados</h3>
      <ul className="import-batches__list">
        {[...batches].reverse().map((batch) => {
          const accountName = batch.accountId ? accountById.get(batch.accountId)?.name : undefined
          const period = describeCoveredPeriod(batch.coveredDays)
          const details = [period, formatDateTime(batch.importedAt), `${batch.transactionIds.length} transações`]
            .filter((part) => part !== undefined && part !== null)
            .join(' · ')
          return (
            <li className="import-batches__row" key={batch.id}>
              <span className="import-batches__name">{batch.fileName}</span>
              <span className="import-batches__meta">{details}</span>
              <select
                value={batch.accountId ?? UNASSIGNED_ACCOUNT_ID}
                onChange={(e) => onReassignAccount(batch.id, e.target.value)}
                title="Conta associada a este lote"
              >
                <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
                {accounts.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {!accountName && <span className="import-batches__warning">sem conta</span>}
              <button type="button" className="btn btn--ghost" onClick={() => handleRemove(batch)}>
                Excluir lote
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
