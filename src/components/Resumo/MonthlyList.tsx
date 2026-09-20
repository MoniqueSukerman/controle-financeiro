import { useState } from 'react'
import type { SummaryRow, SummarySection } from '../../data/types'
import { formatCurrency } from '../../utils/format'

interface MonthlyListProps {
  sections: SummarySection[]
  monthIndex: number
  showGoals?: boolean
  showForecast?: boolean
  onRowClick?: (row: SummaryRow) => void
}

function cellClass(value: number) {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-zero'
}

interface RowContentProps {
  row: SummaryRow
  monthIndex: number
  showGoals?: boolean
  showForecast?: boolean
}

function RowContent({ row, monthIndex, showGoals, showForecast }: RowContentProps) {
  const value = row.values[monthIndex]
  const previsto = row.previstoValues?.[monthIndex] ?? value
  return (
    <>
      <span className="monthly-list__label">{row.label}</span>
      <span className="monthly-list__values">
        <span className={cellClass(value)}>{value === 0 ? '—' : formatCurrency(value)}</span>
        {showForecast && (
          <span className={cellClass(previsto)}>{previsto === 0 ? '—' : formatCurrency(previsto)}</span>
        )}
        {showGoals && (
          <>
            <span className={row.objetivo ? cellClass(row.objetivo) : 'is-zero'}>
              {row.objetivo ? formatCurrency(row.objetivo) : '—'}
            </span>
            <span className={row.falta ? cellClass(row.falta) : 'is-zero'}>
              {row.falta ? formatCurrency(row.falta) : '—'}
            </span>
          </>
        )}
      </span>
    </>
  )
}

export function MonthlyList({ sections, monthIndex, showGoals, showForecast, onRowClick }: MonthlyListProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  function toggleSection(sIndex: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(sIndex) ? next.delete(sIndex) : next.add(sIndex)
      return next
    })
  }

  return (
    <div className="monthly-list">
      <div className="monthly-list__header">
        <span className="monthly-list__label" />
        <span className="monthly-list__values">
          <span>{showForecast ? 'Real' : 'Valor'}</span>
          {showForecast && <span>Previsto</span>}
          {showGoals && (
            <>
              <span>Objetivo</span>
              <span>Falta</span>
            </>
          )}
        </span>
      </div>

      {sections.map((section, sIndex) => {
        const isCollapsed = collapsed.has(sIndex)
        return (
          <section className="monthly-list__section" key={sIndex}>
            {section.title && (
              <button
                type="button"
                className={`monthly-list__title monthly-list__title--toggle ${isCollapsed ? 'is-collapsed' : ''}`}
                onClick={() => toggleSection(sIndex)}
                aria-expanded={!isCollapsed}
              >
                <span className="monthly-list__toggle-icon">{isCollapsed ? '▸' : '▾'}</span>
                {section.title}
              </button>
            )}
            {!isCollapsed && (
              <ul className="monthly-list__rows">
                {section.rows
                  .filter((row) => {
                    if (row.variant === 'subtotal') return true
                    const value = row.values[monthIndex]
                    const previsto = row.previstoValues?.[monthIndex] ?? value
                    return value !== 0 || previsto !== 0
                  })
                  .map((row, rIndex) => {
                    const clickable = Boolean(onRowClick && row.categoryId)
                    return (
                      <li
                        className={`monthly-list__row monthly-list__row--${row.variant ?? 'normal'} ${clickable ? 'is-clickable' : ''}`}
                        key={rIndex}
                      >
                        {clickable ? (
                          <button
                            type="button"
                            className="monthly-list__row-button"
                            onClick={() => onRowClick?.(row)}
                            aria-label={`Ver transações de ${row.label}`}
                          >
                            <RowContent row={row} monthIndex={monthIndex} showGoals={showGoals} showForecast={showForecast} />
                          </button>
                        ) : (
                          <RowContent row={row} monthIndex={monthIndex} showGoals={showGoals} showForecast={showForecast} />
                        )}
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
