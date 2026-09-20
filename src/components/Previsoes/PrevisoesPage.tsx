import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { months } from '../../data/months'
import { UNASSIGNED_ACCOUNT_ID, UNASSIGNED_ACCOUNT_NAME } from '../../data/accounts'
import type { Forecast, ForecastRecurrence, Transaction } from '../../data/types'
import { useAccounts, useCategories, useForecasts, useTransactions } from '../../context/AppDataContext'
import { groupsForSign } from '../../utils/transactionSign'
import type { TransactionSign } from '../../utils/transactionSign'
import { monthKey, occurrencesForMonth } from '../../utils/forecast'
import type { ForecastOccurrence } from '../../utils/forecast'
import { getAvailableYears } from '../../utils/period'
import { formatCurrency, formatDate } from '../../utils/format'
import { MonthSelector } from '../MonthSelector'
import { YearSelector } from '../YearSelector'

interface PrevisoesPageProps {
  monthIndex: number
  year: number
  onMonthChange: (index: number) => void
  onYearChange: (year: number) => void
}

function amountClass(value: number) {
  if (value > 0) return 'is-positive'
  if (value < 0) return 'is-negative'
  return 'is-zero'
}

function recurrenceLabel(forecast: Forecast): string {
  if (forecast.recurrence === 'once') return `Único · ${forecast.startMonth}`
  const end = forecast.endMonth ? ` até ${forecast.endMonth}` : ''
  return `Recorrente desde ${forecast.startMonth}${end}`
}

function transactionsForCategoryMonth(transactions: Transaction[], categoryId: string, key: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(key) && t.splits.some((s) => s.categoryId === categoryId))
}

interface NewForecastFormProps {
  onClose: () => void
}

function NewForecastForm({ onClose }: NewForecastFormProps) {
  const { groups, categoriesByGroup } = useCategories()
  const { accounts } = useAccounts()
  const { addForecast } = useForecasts()

  const [description, setDescription] = useState('')
  const [sign, setSign] = useState<TransactionSign>('saida')
  const [value, setValue] = useState('')
  const [preferredCategoryId, setPreferredCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? UNASSIGNED_ACCOUNT_ID)
  const [recurrence, setRecurrence] = useState<ForecastRecurrence>('monthly')
  const [month, setMonth] = useState(monthKey(new Date().getFullYear(), new Date().getMonth()))
  const [endMonth, setEndMonth] = useState('')

  const visibleGroups = groupsForSign(groups, sign)
  const visibleCategories = visibleGroups.flatMap((group) => categoriesByGroup(group.id))
  const categoryId = visibleCategories.some((c) => c.id === preferredCategoryId)
    ? preferredCategoryId
    : (visibleCategories[0]?.id ?? '')

  const parsedValue = Number.parseFloat(value.replace(',', '.'))
  const endMonthValid = !endMonth || endMonth >= month
  const canSubmit = description.trim().length > 0 && parsedValue > 0 && categoryId && month && endMonthValid

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    addForecast({
      description: description.trim(),
      amount: sign === 'entrada' ? parsedValue : -parsedValue,
      categoryId,
      accountId: accountId === UNASSIGNED_ACCOUNT_ID ? undefined : accountId,
      recurrence,
      startMonth: month,
      endMonth: recurrence === 'monthly' && endMonth ? endMonth : undefined,
    })
    onClose()
  }

  return (
    <form className="forecast-form" onSubmit={handleSubmit}>
      <div className="forecast-form__row">
        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <div className="transaction-form__sign">
          <button type="button" className={recurrence === 'monthly' ? 'is-active' : ''} onClick={() => setRecurrence('monthly')}>
            Recorrente
          </button>
          <button type="button" className={recurrence === 'once' ? 'is-active' : ''} onClick={() => setRecurrence('once')}>
            Mês específico
          </button>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
        {recurrence === 'monthly' && (
          <input
            type="month"
            placeholder="Mês final (opcional)"
            title="Mês final (opcional)"
            min={month}
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
          />
        )}
      </div>

      <div className="forecast-form__row">
        <div className="transaction-form__sign">
          <button type="button" className={sign === 'entrada' ? 'is-active' : ''} onClick={() => setSign('entrada')}>
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
        <select value={categoryId} onChange={(e) => setPreferredCategoryId(e.target.value)}>
          {visibleGroups.map((group) => (
            <optgroup label={group.name} key={group.id}>
              {categoriesByGroup(group.id).map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value={UNASSIGNED_ACCOUNT_ID}>{UNASSIGNED_ACCOUNT_NAME}</option>
          {accounts.map((account) => (
            <option value={account.id} key={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="transaction-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
          Salvar previsão
        </button>
      </div>
    </form>
  )
}

interface ForecastRowProps {
  forecast: Forecast
}

function ForecastRow({ forecast }: ForecastRowProps) {
  const { categoryById } = useCategories()
  const { accountById } = useAccounts()
  const { updateForecast, removeForecast } = useForecasts()

  const [description, setDescription] = useState(forecast.description)

  function handleRemove() {
    const ok = window.confirm(`Excluir a previsão "${forecast.description}"? Isso remove todas as ocorrências futuras e passadas dela.`)
    if (ok) removeForecast(forecast.id)
  }

  function commitDescription() {
    const trimmed = description.trim()
    if (trimmed && trimmed !== forecast.description) updateForecast(forecast.id, { description: trimmed })
  }

  const accountName = forecast.accountId ? (accountById.get(forecast.accountId)?.name ?? UNASSIGNED_ACCOUNT_NAME) : UNASSIGNED_ACCOUNT_NAME

  return (
    <li className="forecast-card">
      <div className="forecast-card__body">
        <div className="forecast-card__main">
          <input
            className="forecast-card__name"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
          />
          <span className={`forecast-card__amount ${amountClass(forecast.amount)}`}>{formatCurrency(forecast.amount)}</span>
        </div>
        <div className="forecast-card__meta">
          <span className="badge">{categoryById.get(forecast.categoryId)?.name ?? forecast.categoryId}</span>
          <span className="badge">{accountName}</span>
          <span>{recurrenceLabel(forecast)}</span>
        </div>
      </div>
      <button type="button" className="forecast-card__remove" onClick={handleRemove} aria-label="Excluir previsão">
        ×
      </button>
    </li>
  )
}

interface OccurrenceGroupProps {
  title: string
  occurrences: ForecastOccurrence[]
  transactions: Transaction[]
  monthKey: string
}

function OccurrenceGroup({ title, occurrences, transactions, monthKey: key }: OccurrenceGroupProps) {
  if (occurrences.length === 0) return null

  return (
    <div className="occurrence-group">
      <h3 className="occurrence-group__title">
        {title} <span className="occurrence-group__count">{occurrences.length}</span>
      </h3>
      <ul className="occurrence-list">
        {occurrences.map((occurrence) => (
          <OccurrenceRow
            occurrence={occurrence}
            matchingTransactions={transactionsForCategoryMonth(transactions, occurrence.forecast.categoryId, key)}
            key={`${occurrence.forecast.id}-${occurrence.monthKey}`}
          />
        ))}
      </ul>
    </div>
  )
}

interface OccurrenceRowProps {
  occurrence: ForecastOccurrence
  matchingTransactions: Transaction[]
}

function OccurrenceRow({ occurrence, matchingTransactions }: OccurrenceRowProps) {
  const { categoryById } = useCategories()
  const { settleForecastMonth, unsettleForecastMonth, skipForecastMonth, unskipForecastMonth, overrideForecastMonth, endForecastRecurrence } =
    useForecasts()
  const { transactions } = useTransactions()

  const [isOpen, setIsOpen] = useState(false)
  const [amountInput, setAmountInput] = useState(String(occurrence.amount))

  const settledTransactions = occurrence.settledTransactionIds
    .map((id) => transactions.find((t) => t.id === id))
  const unsettledMatchingTransactions = matchingTransactions.filter(
    (t) => !occurrence.settledTransactionIds.includes(t.id),
  )

  function commitAmount() {
    const parsed = Number.parseFloat(amountInput.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed === occurrence.amount) return
    overrideForecastMonth(occurrence.forecast.id, occurrence.monthKey, { amount: parsed })
  }

  return (
    <li className={`occurrence-card ${occurrence.status === 'pulada' ? 'occurrence-card--pulada' : ''}`}>
      <button type="button" className="occurrence-card__summary" onClick={() => setIsOpen((v) => !v)}>
        <span className="occurrence-card__desc">{occurrence.forecast.description}</span>
        <span className="badge">{categoryById.get(occurrence.forecast.categoryId)?.name ?? occurrence.forecast.categoryId}</span>
        <span className={`occurrence-card__amount ${amountClass(occurrence.amount)}`}>{formatCurrency(occurrence.amount)}</span>
        <span className={`occurrence-card__chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="occurrence-card__details">
          {occurrence.status !== 'pulada' && (
            <>
              {settledTransactions.map((settledTransaction, index) => (
                <div className="occurrence-card__settled" key={occurrence.settledTransactionIds[index]}>
                  <span className="occurrence-card__note">
                    {settledTransaction
                      ? `${settledTransaction.description} · ${formatDate(settledTransaction.date)}`
                      : 'transação removida'}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() =>
                      unsettleForecastMonth(occurrence.forecast.id, occurrence.monthKey, occurrence.settledTransactionIds[index])
                    }
                  >
                    Desvincular
                  </button>
                </div>
              ))}

              {occurrence.status === 'pendente' && (
                <input
                  type="number"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onBlur={commitAmount}
                />
              )}

              {unsettledMatchingTransactions.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) settleForecastMonth(occurrence.forecast.id, occurrence.monthKey, e.target.value)
                  }}
                >
                  <option value="">Vincular a transação…</option>
                  {unsettledMatchingTransactions.map((t) => (
                    <option value={t.id} key={t.id}>
                      {formatDate(t.date)} · {t.description} · {formatCurrency(t.amount)}
                    </option>
                  ))}
                </select>
              )}

              {occurrence.status === 'pendente' && (
                <>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => skipForecastMonth(occurrence.forecast.id, occurrence.monthKey)}>
                    Pular mês
                  </button>
                  {occurrence.forecast.recurrence === 'monthly' && !occurrence.forecast.endMonth && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => endForecastRecurrence(occurrence.forecast.id, occurrence.monthKey)}
                    >
                      Encerrar recorrência
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {occurrence.status === 'pulada' && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => unskipForecastMonth(occurrence.forecast.id, occurrence.monthKey)}
            >
              Reativar
            </button>
          )}
        </div>
      )}
    </li>
  )
}

type PrevisoesTab = 'ocorrencias' | 'cadastradas'

export function PrevisoesPage({ monthIndex, year, onMonthChange, onYearChange }: PrevisoesPageProps) {
  const { transactions } = useTransactions()
  const { forecasts } = useForecasts()

  const [activeTab, setActiveTab] = useState<PrevisoesTab>('ocorrencias')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const years = useMemo(() => getAvailableYears(transactions, year), [transactions, year])

  const occurrences = useMemo(() => occurrencesForMonth(forecasts, year, monthIndex), [forecasts, year, monthIndex])
  const key = monthKey(year, monthIndex)

  const pendentes = useMemo(() => occurrences.filter((o) => o.status === 'pendente'), [occurrences])
  const realizadas = useMemo(() => occurrences.filter((o) => o.status === 'realizada'), [occurrences])
  const puladas = useMemo(() => occurrences.filter((o) => o.status === 'pulada'), [occurrences])

  const totals = useMemo(() => {
    let entrada = 0
    let saida = 0
    for (const occurrence of occurrences) {
      if (occurrence.status === 'pulada') continue
      if (occurrence.amount >= 0) entrada += occurrence.amount
      else saida += occurrence.amount
    }
    return { entrada, saida, saldo: entrada + saida }
  }, [occurrences])

  useEffect(() => {
    if (!isFormOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsFormOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  return (
    <div className="resumo">
      <header className="resumo__header">
        <h1>Previsões</h1>
        <p className="resumo__period">Transações previstas — recorrentes ou de um mês específico</p>
      </header>

      <div className="previsoes__toolbar">
        <div className="status-tabs">
          <button type="button" className={activeTab === 'ocorrencias' ? 'is-active' : ''} onClick={() => setActiveTab('ocorrencias')}>
            Ocorrências do mês
          </button>
          <button type="button" className={activeTab === 'cadastradas' ? 'is-active' : ''} onClick={() => setActiveTab('cadastradas')}>
            Previsões cadastradas
          </button>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setIsFormOpen(true)}>
          + Nova previsão
        </button>
      </div>

      {activeTab === 'cadastradas' ? (
        forecasts.length === 0 ? (
          <p className="modal__empty">Nenhuma previsão cadastrada.</p>
        ) : (
          <ul className="forecast-list">
            {forecasts.map((forecast) => (
              <ForecastRow forecast={forecast} key={forecast.id} />
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="period-selector">
            <YearSelector years={years} selected={year} onSelect={onYearChange} />
            <MonthSelector months={months} selected={monthIndex} onSelect={onMonthChange} />
          </div>

          {occurrences.length === 0 ? (
            <p className="modal__empty">Nenhuma previsão para {months[monthIndex]}/{year}.</p>
          ) : (
            <>
              <div className="previsoes__totals">
                <div>
                  <span className="label">Previsto entrada</span>
                  <span className="value is-positive">{formatCurrency(totals.entrada)}</span>
                </div>
                <div>
                  <span className="label">Previsto saída</span>
                  <span className="value is-negative">{formatCurrency(totals.saida)}</span>
                </div>
                <div>
                  <span className="label">Saldo previsto</span>
                  <span className={`value ${amountClass(totals.saldo)}`}>{formatCurrency(totals.saldo)}</span>
                </div>
              </div>

              <OccurrenceGroup title="Pendentes" occurrences={pendentes} transactions={transactions} monthKey={key} />
              <OccurrenceGroup title="Realizadas" occurrences={realizadas} transactions={transactions} monthKey={key} />
              <OccurrenceGroup title="Puladas" occurrences={puladas} transactions={transactions} monthKey={key} />
            </>
          )}
        </>
      )}

      {isFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-forecast-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal__header">
              <h2 id="new-forecast-title" className="modal__title">
                Nova previsão
              </h2>
              <button type="button" className="modal__close" onClick={() => setIsFormOpen(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <div className="modal__body modal__body--padded">
              <NewForecastForm onClose={() => setIsFormOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
