import { Fragment, useState } from 'react'
import type { SummarySection } from '../../data/types'
import { months } from '../../data/months'
import { formatCurrency } from '../../utils/format'

interface AnnualTableProps {
  sections: SummarySection[]
}

function cellClass(value: number) {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-zero'
}

export function AnnualTable({ sections }: AnnualTableProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  function toggleSection(sIndex: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(sIndex) ? next.delete(sIndex) : next.add(sIndex)
      return next
    })
  }

  return (
    <div className="annual-table-wrap">
      <table className="annual-table">
        <thead>
          <tr>
            <th>&nbsp;</th>
            {months.map((month) => (
              <th key={month}>{month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sIndex) => {
            const isCollapsed = collapsed.has(sIndex)
            return (
              <Fragment key={sIndex}>
                {section.title && (
                  <tr
                    className={`annual-table__group is-clickable ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => toggleSection(sIndex)}
                  >
                    <td colSpan={months.length + 1}>
                      <span className="monthly-list__toggle-icon">{isCollapsed ? '▸' : '▾'}</span>
                      {section.title}
                    </td>
                  </tr>
                )}
                {!isCollapsed &&
                  section.rows.map((row, rIndex) => {
                    const rowValues = row.previstoValues ?? row.values
                    return (
                      <tr className={row.variant === 'subtotal' ? 'annual-table__subtotal' : ''} key={rIndex}>
                        <td className="annual-table__label">{row.label}</td>
                        {rowValues.map((value, monthIndex) => (
                          <td className={cellClass(value)} key={monthIndex}>
                            {value === 0 ? '—' : formatCurrency(value)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
