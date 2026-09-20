import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Split } from '../../data/types'
import { useCategories } from '../../context/AppDataContext'
import { UNCATEGORIZED_CATEGORY_NAME } from '../../data/categories'
import { formatCurrency } from '../../utils/format'
import { groupsForSign, signOfAmount } from '../../utils/transactionSign'

const NEW_CATEGORY_OPTION = '__nova-categoria__'

interface SplitEditorProps {
  totalAmount: number
  initialSplits: Split[]
  onSave: (splits: Split[]) => void
  onCancel: () => void
}

export function SplitEditor({ totalAmount, initialSplits, onSave, onCancel }: SplitEditorProps) {
  const { groups, categoryById, categoriesByGroup, addCategory } = useCategories()
  const [splits, setSplits] = useState<Split[]>(initialSplits)
  const [newCategoryTargetIndex, setNewCategoryTargetIndex] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryGroupId, setNewCategoryGroupId] = useState('')

  const visibleGroups = groupsForSign(groups, signOfAmount(totalAmount))
  const visibleCategories = visibleGroups.flatMap((group) => categoriesByGroup(group.id))
  const visibleCategoryIds = new Set(visibleCategories.map((c) => c.id))

  const total = Math.abs(totalAmount)
  const allocated = splits.reduce((sum, s) => sum + s.amount, 0)
  const remaining = total - allocated
  const balanced = Math.abs(remaining) < 0.005

  function updateCategory(index: number, categoryId: string) {
    if (categoryId === NEW_CATEGORY_OPTION) {
      setNewCategoryGroupId(visibleGroups[0]?.id ?? '')
      setNewCategoryTargetIndex(index)
      return
    }
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, categoryId } : s)))
  }

  function closeNewCategoryModal() {
    setNewCategoryTargetIndex(null)
    setNewCategoryName('')
  }

  function handleCreateCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = newCategoryName.trim()
    if (!name || !newCategoryGroupId || newCategoryTargetIndex === null) return
    const id = addCategory(newCategoryGroupId, name)
    updateCategory(newCategoryTargetIndex, id)
    closeNewCategoryModal()
  }

  function updateAmount(index: number, amount: number) {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, amount } : s)))
  }

  function removeSplit(index: number) {
    setSplits((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (newCategoryTargetIndex === null) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeNewCategoryModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [newCategoryTargetIndex])

  function addSplit() {
    const usedIds = new Set(splits.map((s) => s.categoryId))
    const nextCategory = visibleCategories.find((c) => !usedIds.has(c.id)) ?? visibleCategories[0]
    if (!nextCategory) return
    const amount = remaining > 0 ? Math.round(remaining * 100) / 100 : 0
    setSplits((prev) => [...prev, { categoryId: nextCategory.id, amount }])
  }

  return (
    <>
    <div className="split-editor">
      <div className="split-editor__rows">
        {splits.map((split, index) => (
          <div className="split-editor__row" key={index}>
            <select
              className="split-editor__category"
              value={split.categoryId}
              onChange={(e) => updateCategory(index, e.target.value)}
            >
              {!visibleCategoryIds.has(split.categoryId) && (
                <option value={split.categoryId} disabled>
                  {categoryById.get(split.categoryId)?.name ?? UNCATEGORIZED_CATEGORY_NAME}
                </option>
              )}
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
            <input
              className="split-editor__amount"
              type="number"
              step="0.01"
              value={split.amount}
              onChange={(e) => updateAmount(index, Number(e.target.value))}
            />
            <button
              type="button"
              className="split-editor__remove"
              onClick={() => removeSplit(index)}
              disabled={splits.length <= 1}
              aria-label="Remover categoria"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="split-editor__add" onClick={addSplit}>
        + Dividir em outra categoria
      </button>

      <div className={`split-editor__footer ${balanced ? 'is-balanced' : 'is-unbalanced'}`}>
        <span>
          Alocado {formatCurrency(allocated)} de {formatCurrency(total)}
        </span>
        {!balanced && <span className="split-editor__remaining">Falta alocar {formatCurrency(remaining)}</span>}
      </div>

      <div className="split-editor__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary" disabled={!balanced} onClick={() => onSave(splits)}>
          Salvar divisão
        </button>
      </div>
    </div>

    {newCategoryTargetIndex !== null && (
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
