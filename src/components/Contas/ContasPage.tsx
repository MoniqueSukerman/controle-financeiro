import { useEffect, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { useAccounts } from '../../context/AppDataContext'

export function ContasPage() {
  const { accounts, addAccount, renameAccount, removeAccount, reorderAccount } = useAccounts()
  const [newAccountName, setNewAccountName] = useState('')
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null)

  function openAccountModal() {
    setIsAccountModalOpen(true)
  }

  function closeAccountModal() {
    setIsAccountModalOpen(false)
    setNewAccountName('')
  }

  useEffect(() => {
    if (!isAccountModalOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAccountModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAccountModalOpen])

  function handleAddAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newAccountName.trim()) return
    addAccount(newAccountName.trim())
    setNewAccountName('')
    setIsAccountModalOpen(false)
  }

  function handleRemove(id: string, name: string) {
    const ok = window.confirm(
      `Excluir a conta "${name}"? Transações associadas ficam como "Sem conta". Essa ação não pode ser desfeita.`,
    )
    if (ok) removeAccount(id)
  }

  function handleAccountDragStart(accountId: string) {
    setDraggedAccountId(accountId)
  }

  function handleAccountDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault()
  }

  function handleAccountDrop(targetAccountId: string) {
    if (draggedAccountId) reorderAccount(draggedAccountId, targetAccountId)
    setDraggedAccountId(null)
  }

  return (
    <div className="categorias">
      <header className="categorias__header">
        <h1>Contas</h1>
        <p className="categorias__period">Bancos e carteiras usados para agrupar transações e demonstrativos</p>
      </header>

      <div className="categorias__actions categorias__actions--end">
        <button type="button" className="btn btn--primary" onClick={openAccountModal}>
          + Conta
        </button>
      </div>

      <div className="categorias__groups">
        {accounts.map((account) => (
          <section
            className={`category-group${draggedAccountId === account.id ? ' is-dragging' : ''}`}
            key={account.id}
            draggable
            onDragStart={() => handleAccountDragStart(account.id)}
            onDragOver={handleAccountDragOver}
            onDrop={() => handleAccountDrop(account.id)}
            onDragEnd={() => setDraggedAccountId(null)}
          >
            <header className="category-group__header">
              <span className="category-group__drag-handle" aria-hidden="true">⠿</span>
              <input
                className="category-group__name"
                value={account.name}
                onChange={(e) => renameAccount(account.id, e.target.value)}
              />
              <div className="category-group__actions">
                <button
                  type="button"
                  className="category-group__remove"
                  onClick={() => handleRemove(account.id, account.name)}
                >
                  Excluir
                </button>
              </div>
            </header>
          </section>
        ))}
      </div>

      {isAccountModalOpen && (
        <div className="modal-backdrop" onClick={closeAccountModal}>
          <div
            className="modal modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-account-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__header">
              <h2 id="new-account-title" className="modal__title">
                Nova conta
              </h2>
              <button type="button" className="modal__close" onClick={closeAccountModal} aria-label="Fechar">
                ×
              </button>
            </header>
            <form className="modal__body modal__body--padded categorias__new-group" onSubmit={handleAddAccount}>
              <input
                type="text"
                placeholder="Nome da nova conta"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn--primary" disabled={!newAccountName.trim()}>
                Criar conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
