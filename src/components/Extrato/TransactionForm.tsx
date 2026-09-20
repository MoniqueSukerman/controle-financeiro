import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAccounts, useCategories } from '../../context/AppDataContext'
import { UNASSIGNED_ACCOUNT_ID } from '../../data/accounts'
import { groupsForSign } from '../../utils/transactionSign'
import type { TransactionSign } from '../../utils/transactionSign'

const NEW_CATEGORY_OPTION = '__nova-categoria__'

interface TransactionFormProps {
  onSubmit: (input: { date: string; description: string; amount: number; categoryId: string; accountId: string }) => void
  onCancel: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({ onSubmit, onCancel }: TransactionFormProps) {
  const { groups, categoriesByGroup, addCategory } = useCategories()
  const { accounts } = useAccounts()
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [sign, setSign] = useState<TransactionSign>('saida')
  const [value, setValue] = useState('')
  const [preferredCategoryId, setPreferredCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? UNASSIGNED_ACCOUNT_ID)
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryGroupId, setNewCategoryGroupId] = useState('')

  const visibleGroups = groupsForSign(groups, sign)
  const visibleCategories = visibleGroups.flatMap((group) => categoriesByGroup(group.id))
  const categoryId = visibleCategories.some((c) => c.id === preferredCategoryId)
    ? preferredCategoryId
    : (visibleCategories[0]?.id ?? '')

  const parsedValue = Number.parseFloat(value.replace(',', '.'))
  const canSubmit = description.trim().length > 0 && parsedValue > 0 && categoryId && accountId

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      date,
      description: description.trim(),
      amount: sign === 'entrada' ? parsedValue : -parsedValue,
      categoryId,
      accountId,
    })
  }

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_OPTION) {
      setNewCategoryGroupId(visibleGroups[0]?.id ?? '')
      setIsNewCategoryModalOpen(true)
      return
    }
    setPreferredCategoryId(value)
  }

  function closeNewCategoryModal() {
    setIsNewCategoryModalOpen(false)
    setNewCategoryName('')
  }

  useEffect(() => {
    if (!isNewCategoryModalOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeNewCategoryModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isNewCategoryModalOpen])

  function handleCreateCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = newCategoryName.trim()
    if (!name || !newCategoryGroupId) return
    const id = addCategory(newCategoryGroupId, name)
    setPreferredCategoryId(id)
    closeNewCategoryModal()
  }

  return (
    <>
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="transaction-form__row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="transaction-form__row">
        <div className="transaction-form__sign">
          <button
            type="button"
            className={sign === 'entrada' ? 'is-active' : ''}
            onClick={() => setSign('entrada')}
          >
            Entrada
          </button>
          <button type="button" className={sign === 'saida' ? 'is-active' : ''} onClick={() => setSign('saida')}>
            Saída
          </button>
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <select value={categoryId} onChange={(e) => handleCategorySelect(e.target.value)}>
          {visibleGroups.map((group) => (
            <optgroup label={group.name} key={group.id}>
              {categoriesByGroup(group.id).map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={NEW_CATEGORY_OPTION}>+ Nova categoria...</option>
        </select>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="transaction-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
          Adicionar
        </button>
      </div>
    </form>

    {isNewCategoryModalOpen && (
      <div className="modal-backdrop" onClick={closeNewCategoryModal}>
        <div
          className="modal modal--narrow"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-category-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="modal__header">
            <h2 id="new-category-title" className="modal__title">
              Nova categoria
            </h2>
            <button type="button" className="modal__close" onClick={closeNewCategoryModal} aria-label="Fechar">
              ×
            </button>
          </header>
          <form className="modal__body modal__body--padded categorias__new-group" onSubmit={handleCreateCategory}>
            <input
              type="text"
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
            />
            <select value={newCategoryGroupId} onChange={(e) => setNewCategoryGroupId(e.target.value)}>
              {visibleGroups.map((group) => (
                <option value={group.id} key={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn--primary" disabled={!newCategoryName.trim()}>
              Criar categoria
            </button>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
