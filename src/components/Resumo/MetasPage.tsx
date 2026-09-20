import { useMemo, useState } from 'react'
import { months } from '../../data/months'
import { useAccounts, useCategories, useForecasts, useTransactions } from '../../context/AppDataContext'
import { buildAccountSections, buildCategorySections } from '../../utils/summary'
import type { SummaryScope } from '../../utils/summary'
import { getAvailableYears } from '../../utils/period'
import { MonthSelector } from '../MonthSelector'
import { YearSelector } from '../YearSelector'
import { MonthlyList } from './MonthlyList'
import { AnnualTable } from './AnnualTable'
import { CategoryTransactionsModal } from './CategoryTransactionsModal'

const SCOPE: SummaryScope = { kinds: ['meta', 'transferencia'], transferSide: 'destino' }

type ViewMode = 'mensal' | 'anual'

interface MetasPageProps {
  monthIndex: number
  year: number
  onMonthChange: (index: number) => void
  onYearChange: (year: number) => void
}

export function MetasPage({ monthIndex, year, onMonthChange, onYearChange }: MetasPageProps) {
  const { transactions } = useTransactions()
  const { forecasts } = useForecasts()
  const { groups, categories } = useCategories()
  const { accounts } = useAccounts()
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('mensal')

  const years = useMemo(() => getAvailableYears(transactions, year), [transactions, year])

  const sections = useMemo(
    () => buildCategorySections(transactions, forecasts, groups, categories, SCOPE, year),
    [transactions, forecasts, groups, categories, year],
  )

  const accountSections = useMemo(
    () => buildAccountSections(transactions, forecasts, accounts, year, { groups, categories, scope: SCOPE }),
    [transactions, forecasts, accounts, groups, categories, year],
  )

  return (
    <div className="resumo">
      <header className="resumo__header">
        <h1>Metas</h1>
        <p className="resumo__period">Guardado no mês por categoria · acumulado por conta</p>
      </header>

      <div className="period-selector">
        <YearSelector years={years} selected={year} onSelect={onYearChange} />
        {viewMode === 'mensal' && <MonthSelector months={months} selected={monthIndex} onSelect={onMonthChange} />}
        <div className="status-tabs">
          <button type="button" className={viewMode === 'mensal' ? 'is-active' : ''} onClick={() => setViewMode('mensal')}>
            Mensal
          </button>
          <button type="button" className={viewMode === 'anual' ? 'is-active' : ''} onClick={() => setViewMode('anual')}>
            Anual
          </button>
        </div>
      </div>

      <h2 className="resumo__subtitle">Por categoria</h2>
      {viewMode === 'mensal' ? (
        <MonthlyList
          sections={sections}
          monthIndex={monthIndex}
          showForecast
          onRowClick={(row) => row.categoryId && setOpenCategoryId(row.categoryId)}
        />
      ) : (
        <AnnualTable sections={sections} />
      )}

      <h2 className="resumo__subtitle">Por conta</h2>
      {viewMode === 'mensal' ? (
        <MonthlyList sections={accountSections} monthIndex={monthIndex} showForecast />
      ) : (
        <AnnualTable sections={accountSections} />
      )}

      {openCategoryId && (
        <CategoryTransactionsModal
          categoryId={openCategoryId}
          scope={SCOPE}
          year={year}
          monthIndex={monthIndex}
          onClose={() => setOpenCategoryId(null)}
        />
      )}
    </div>
  )
}
