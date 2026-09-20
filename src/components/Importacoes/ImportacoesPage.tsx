import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { UNCATEGORIZED_CATEGORY_ID } from '../../data/categories'
import { UNASSIGNED_ACCOUNT_ID } from '../../data/accounts'
import { useAccounts, useTransactions } from '../../context/AppDataContext'
import { parseOfx } from '../../utils/ofx'
import type { ImportResult } from '../../utils/importCoverage'
import { ImportBatchList } from './ImportBatchList'

function count(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`
}

function describeImportResult(result: ImportResult): string {
  const { imported, skipped, importedDays, skippedDays } = result
  if (imported === 0) {
    const alreadyImported = skippedDays.length === 1 ? 'já foi importado' : 'já foram importados'
    return `Nenhuma transação nova: ${count(skippedDays.length, 'dia', 'dias')} do arquivo ${alreadyImported} nesta conta.`
  }

  const importedPart = `${count(imported, 'transação importada', 'transações importadas')} em ${count(importedDays.length, 'dia novo', 'dias novos')}`
  if (skipped === 0) return `${importedPart}.`

  const skippedPart = `${count(skipped, 'transação ignorada', 'transações ignoradas')} em ${count(skippedDays.length, 'dia já importado', 'dias já importados')} nesta conta`
  return `${importedPart}; ${skippedPart}.`
}

export function ImportacoesPage() {
  const { importBatches, importTransactions, reassignImportBatchAccount, removeImportBatch, restoreFromJson, mergeFromJson } =
    useTransactions()
  const { accounts, accountById } = useAccounts()
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)
  const [importAccountId, setImportAccountId] = useState(accounts[0]?.id ?? UNASSIGNED_ACCOUNT_ID)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const text = await file.text()
    const entries = parseOfx(text)
    if (entries.length === 0) {
      setImportMessage('Nenhuma transação encontrada no arquivo.')
      return
    }

    const result = importTransactions({
      fileName: file.name,
      accountId: importAccountId,
      categoryId: UNCATEGORIZED_CATEGORY_ID,
      entries,
    })
    setImportMessage(describeImportResult(result))
  }

  async function readJsonFile(e: ChangeEvent<HTMLInputElement>): Promise<unknown | null> {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return null

    try {
      return JSON.parse(await file.text())
    } catch {
      setRestoreMessage('Arquivo inválido — não é um JSON legível.')
      return null
    }
  }

  async function handleMergeFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const data = await readJsonFile(e)
    if (data === null) return

    const result = mergeFromJson(data)
    if (!result.ok || !result.added) {
      setRestoreMessage(result.error ?? 'Falha ao mesclar backup.')
      return
    }
    const { groups, categories, accounts: newAccounts, transactions, importBatches: batches } = result.added
    setRestoreMessage(
      `Mesclado: ${groups} grupo(s), ${categories} categoria(s), ${newAccounts} conta(s), ${transactions} transação(ões) e ${batches} lote(s) novos. Nada existente foi alterado.`,
    )
  }

  async function handleReplaceFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const data = await readJsonFile(e)
    if (data === null) return

    const confirmed = window.confirm(
      'Substituir apaga TODAS as categorias, grupos, contas, transações e importações atuais e usa só o que está no arquivo. Essa ação não pode ser desfeita. Continuar?',
    )
    if (!confirmed) return

    const result = restoreFromJson(data)
    setRestoreMessage(result.ok ? 'Backup restaurado com sucesso.' : (result.error ?? 'Falha ao restaurar backup.'))
  }

  return (
    <div className="importacoes">
      <header className="importacoes__header">
        <h1>Importações OFX</h1>
        <p className="importacoes__period">Importe extratos bancários (.ofx/.qfx) e gerencie os lotes importados</p>
      </header>

      <div className="importacoes__actions">
        <select value={importAccountId} onChange={(e) => setImportAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--primary" onClick={() => fileInputRef.current?.click()}>
          Importar OFX
        </button>
        <input ref={fileInputRef} type="file" accept=".ofx,.qfx" hidden onChange={handleFileSelected} />
        {importMessage && <span className="extrato__import-message">{importMessage}</span>}
      </div>

      {importBatches.length === 0 ? (
        <p className="importacoes__empty">
          Nenhuma importação ainda. Transações importadas entram como "Não categorizado" no Extrato. Cada lote registra
          os dias que cobriu na conta escolhida; reimportar o mesmo período não duplica lançamentos.
        </p>
      ) : (
        <ImportBatchList
          batches={importBatches}
          accounts={accounts}
          accountById={accountById}
          onRemove={removeImportBatch}
          onReassignAccount={reassignImportBatchAccount}
        />
      )}

      <section className="importacoes__restore">
        <h3 className="importacoes__restore-title">Restaurar backup</h3>
        <p className="importacoes__period">
          Mescla categorias, grupos, contas, transações e importações de um arquivo de backup (.json) com os dados atuais —
          só adiciona o que ainda não existe, nada é removido ou sobrescrito.
        </p>
        <div className="importacoes__actions">
          <button type="button" className="btn btn--primary" onClick={() => mergeInputRef.current?.click()}>
            Mesclar backup JSON
          </button>
          <input
            ref={mergeInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleMergeFileSelected}
          />
          {restoreMessage && <span className="extrato__import-message">{restoreMessage}</span>}
        </div>

        <details className="importacoes__danger">
          <summary>Substituir tudo pelo backup (avançado)</summary>
          <p className="importacoes__period">
            Apaga os dados atuais e usa só o que está no arquivo. Use apenas se quiser descartar o que tem aqui.
          </p>
          <div className="importacoes__actions">
            <button type="button" className="btn btn--ghost" onClick={() => replaceInputRef.current?.click()}>
              Substituir por backup JSON
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleReplaceFileSelected}
            />
          </div>
        </details>
      </section>
    </div>
  )
}
