import { useEffect, useState } from 'react'
import './App.css'
import { AppDataProvider } from './context/AppDataContext'
import { ExtratoPage } from './components/Extrato/ExtratoPage'
import { OrcamentoPage } from './components/Resumo/OrcamentoPage'
import { MetasPage } from './components/Resumo/MetasPage'
import { PrevisoesPage } from './components/Previsoes/PrevisoesPage'
import { CategoriasPage } from './components/Categorias/CategoriasPage'
import { ContasPage } from './components/Contas/ContasPage'
import { ImportacoesPage } from './components/Importacoes/ImportacoesPage'
import { BackupStatusBar } from './components/BackupStatusBar'

type Tab = 'transacoes' | 'orcamento' | 'metas' | 'previsoes' | 'categorias' | 'contas' | 'importacoes'

const now = new Date()

function App() {
  const [tab, setTab] = useState<Tab>('transacoes')
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  function selectTab(next: Tab) {
    setTab(next)
    setMenuOpen(false)
  }

  return (
    <AppDataProvider>
      <div className="app">
        <header className="app__topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <span className="app__title">Controle financeiro</span>
        </header>

        {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

        <nav className={`tabs ${menuOpen ? 'is-open' : ''}`}>
          <div className="tabs__nav">
            <button className={tab === 'transacoes' ? 'is-active' : ''} onClick={() => selectTab('transacoes')}>
              Transações
            </button>
            <button className={tab === 'orcamento' ? 'is-active' : ''} onClick={() => selectTab('orcamento')}>
              Orçamento
            </button>
            <button className={tab === 'metas' ? 'is-active' : ''} onClick={() => selectTab('metas')}>
              Metas
            </button>
            <button className={tab === 'previsoes' ? 'is-active' : ''} onClick={() => selectTab('previsoes')}>
              Previsões
            </button>
            <button className={tab === 'categorias' ? 'is-active' : ''} onClick={() => selectTab('categorias')}>
              Categorias
            </button>
            <button className={tab === 'contas' ? 'is-active' : ''} onClick={() => selectTab('contas')}>
              Contas
            </button>
            <button className={tab === 'importacoes' ? 'is-active' : ''} onClick={() => selectTab('importacoes')}>
              Importações
            </button>
          </div>

          <div className="tabs__backup">
            <BackupStatusBar />
          </div>
        </nav>

        <div className="app__main">
          <main className="app__content">
            {tab === 'transacoes' && (
              <ExtratoPage monthIndex={monthIndex} year={year} onMonthChange={setMonthIndex} onYearChange={setYear} />
            )}
            {tab === 'orcamento' && (
              <OrcamentoPage monthIndex={monthIndex} year={year} onMonthChange={setMonthIndex} onYearChange={setYear} />
            )}
            {tab === 'metas' && (
              <MetasPage monthIndex={monthIndex} year={year} onMonthChange={setMonthIndex} onYearChange={setYear} />
            )}
            {tab === 'previsoes' && (
              <PrevisoesPage monthIndex={monthIndex} year={year} onMonthChange={setMonthIndex} onYearChange={setYear} />
            )}
            {tab === 'categorias' && <CategoriasPage />}
            {tab === 'contas' && <ContasPage />}
            {tab === 'importacoes' && <ImportacoesPage />}
          </main>
        </div>
      </div>
    </AppDataProvider>
  )
}

export default App
