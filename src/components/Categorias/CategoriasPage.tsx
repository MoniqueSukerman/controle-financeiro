import { useEffect, useMemo, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { useCategories } from '../../context/AppDataContext'
import type { CategoryKind } from '../../data/types'

type Tab = 'orcamento' | 'meta'

const kindLabel: Record<CategoryKind, string> = {
  entrada: 'Entradas',
  saida: 'Saídas',
  meta: 'Metas',
  transferencia: 'Transferências',
}

const tabLabel: Record<Tab, string> = {
  orcamento: 'Orçamento',
  meta: 'Metas',
}

const tabDescription: Record<Tab, string> = {
  orcamento: 'Grupos e categorias de entradas, saídas e transferências que alimentam o demonstrativo de Orçamento',
  meta: 'Grupos e categorias de metas e transferências que alimentam o demonstrativo de Metas',
}

const tabKinds: Record<Tab, CategoryKind[]> = {
  orcamento: ['entrada', 'saida', 'transferencia'],
  meta: ['meta', 'transferencia'],
}

export function CategoriasPage() {
  const {
    groups,
    categoriesByGroup,
    addGroup,
    renameGroup,
    removeGroup,
    reorderGroup,
    addCategory,
    renameCategory,
    removeCategory,
    reorderCategory,
  } = useCategories()

  const [tab, setTab] = useState<Tab>('orcamento')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupKind, setNewGroupKind] = useState<CategoryKind>('saida')
  const [newCategoryName, setNewCategoryName] = useState<Record<string, string>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)

  const kinds = tabKinds[tab]

  const tabGroups = useMemo(
    () => groups.filter((group) => kinds.includes(group.kind)),
    [groups, kinds],
  )

  function handleSelectTab(next: Tab) {
    setTab(next)
    setNewGroupKind(tabKinds[next][0])
  }

  function openGroupModal() {
    setNewGroupKind(kinds[0])
    setIsGroupModalOpen(true)
  }

  function closeGroupModal() {
    setIsGroupModalOpen(false)
    setNewGroupName('')
  }

  useEffect(() => {
    if (!isGroupModalOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeGroupModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isGroupModalOpen])

  function handleAddGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    addGroup(newGroupName.trim(), newGroupKind)
    setNewGroupName('')
    setIsGroupModalOpen(false)
  }

  function handleAddCategory(groupId: string) {
    const name = (newCategoryName[groupId] ?? '').trim()
    if (!name) return
    addCategory(groupId, name)
    setNewCategoryName((prev) => ({ ...prev, [groupId]: '' }))
  }

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  function handleGroupDragStart(groupId: string) {
    setDraggedGroupId(groupId)
  }

  function handleGroupDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault()
  }

  function handleGroupDrop(targetGroupId: string) {
    if (draggedGroupId) reorderGroup(draggedGroupId, targetGroupId, kinds)
    setDraggedGroupId(null)
  }

  function handleCategoryDragStart(categoryId: string) {
    setDraggedCategoryId(categoryId)
  }

  function handleCategoryDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault()
  }

  function handleCategoryDrop(targetCategoryId: string) {
    if (draggedCategoryId) reorderCategory(draggedCategoryId, targetCategoryId)
    setDraggedCategoryId(null)
  }

  return (
    <div className="categorias">
      <header className="categorias__header">
        <h1>Categorias e grupos</h1>
        <p className="categorias__period">{tabDescription[tab]}</p>
      </header>

      <div className="categorias__toolbar">
        <div className="status-tabs">
          {(Object.keys(tabLabel) as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'is-active' : ''} onClick={() => handleSelectTab(t)}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        <div className="categorias__actions">
          <button type="button" className="btn btn--primary" onClick={openGroupModal}>
            + Grupo
          </button>
        </div>
      </div>

      <div className="categorias__groups">
        {tabGroups.map((group) => {
          const groupCategories = categoriesByGroup(group.id)
          const isCollapsed = collapsedGroups.has(group.id)
          return (
            <section
              className={`category-group${draggedGroupId === group.id ? ' is-dragging' : ''}`}
              key={group.id}
              draggable
              onDragStart={() => handleGroupDragStart(group.id)}
              onDragOver={handleGroupDragOver}
              onDrop={() => handleGroupDrop(group.id)}
              onDragEnd={() => setDraggedGroupId(null)}
            >
              <header className="category-group__header">
                <span className="category-group__drag-handle" aria-hidden="true">⠿</span>
                <button
                  type="button"
                  className="category-group__toggle"
                  onClick={() => toggleGroupCollapsed(group.id)}
                  aria-label={isCollapsed ? 'Expandir grupo' : 'Ocultar grupo'}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
                <span className={`badge badge--${group.kind}`}>{kindLabel[group.kind]}</span>
                <input
                  className="category-group__name"
                  value={group.name}
                  onChange={(e) => renameGroup(group.id, e.target.value)}
                />
                <div className="category-group__actions">
                  <button
                    type="button"
                    className="category-group__remove"
                    onClick={() => removeGroup(group.id)}
                    disabled={groupCategories.length > 0}
                    title={
                      groupCategories.length > 0
                        ? 'Remova as categorias do grupo antes de excluir'
                        : 'Excluir grupo'
                    }
                  >
                    Excluir
                  </button>
                </div>
              </header>

              {!isCollapsed && (
                <>
                  <ul className="category-group__list">
                    {groupCategories.map((category) => (
                      <li
                        className={`category-item${draggedCategoryId === category.id ? ' is-dragging' : ''}`}
                        key={category.id}
                        draggable
                        onDragStart={() => handleCategoryDragStart(category.id)}
                        onDragOver={handleCategoryDragOver}
                        onDrop={() => handleCategoryDrop(category.id)}
                        onDragEnd={() => setDraggedCategoryId(null)}
                      >
                        <span className="category-item__drag-handle" aria-hidden="true">⠿</span>
                        <input
                          className="category-item__name"
                          value={category.name}
                          onChange={(e) => renameCategory(category.id, e.target.value)}
                        />
                        <div className="category-item__actions">
                          <button
                            type="button"
                            className="category-item__remove"
                            onClick={() => removeCategory(category.id)}
                            aria-label="Excluir categoria"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="category-group__add">
                    <input
                      type="text"
                      placeholder="Nova categoria"
                      value={newCategoryName[group.id] ?? ''}
                      onChange={(e) => setNewCategoryName((prev) => ({ ...prev, [group.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCategory(group.id)
                        }
                      }}
                    />
                    <button type="button" onClick={() => handleAddCategory(group.id)}>
                      + Categoria
                    </button>
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>

      {isGroupModalOpen && (
        <div className="modal-backdrop" onClick={closeGroupModal}>
          <div
            className="modal modal--narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-group-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__header">
              <h2 id="new-group-title" className="modal__title">
                Novo grupo
              </h2>
              <button type="button" className="modal__close" onClick={closeGroupModal} aria-label="Fechar">
                ×
              </button>
            </header>
            <form className="modal__body modal__body--padded categorias__new-group" onSubmit={handleAddGroup}>
              <input
                type="text"
                placeholder="Nome do novo grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
              <select value={newGroupKind} onChange={(e) => setNewGroupKind(e.target.value as CategoryKind)}>
                {kinds.map((kind) => (
                  <option value={kind} key={kind}>
                    {kindLabel[kind]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn--primary" disabled={!newGroupName.trim()}>
                Criar grupo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
