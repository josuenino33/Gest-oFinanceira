import { useCallback, useEffect, useState } from 'react'
import api from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())
  const [mesFim, setMesFim] = useState(now.getMonth())
  const [anoFim, setAnoFim] = useState(now.getFullYear())
  const [actionLoading, setActionLoading] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
  const [patrimonioData, setPatrimonioData] = useState(null)
  const [insights, setInsights] = useState([])

  const carregarDashboard = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true)
    setRefreshing(true)
    try {
      const res = await api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`)
      setData(res.data)
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
      setData({
        receitas: 0, despesas: 0, saldo: 0, meta_economia: 0,
        categorias: [],
        contas_pagar: [],
        compras_cartao: [],
        metas: [],
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [mesSelecionado, anoSelecionado, mesFim, anoFim])

  useEffect(() => {
    carregarDashboard({ showLoading: true })
    api.get('/patrimonio').then(r => setPatrimonioData(r.data)).catch(console.error)
    api.get('/insights').then(r => setInsights(r.data)).catch(console.error)
  }, [carregarDashboard])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        carregarDashboard()
      }
    }

    const interval = setInterval(refreshIfVisible, 60000)
    window.addEventListener('focus', refreshIfVisible)
    window.addEventListener('pageshow', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshIfVisible)
      window.removeEventListener('pageshow', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [carregarDashboard])

  const chartData = (data?.historico || mesesLabel.map(m => ({ name: m, receitas: 0, despesas: 0 })))

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const marcarPaga = async (id) => {
    setActionLoading(id)
    try {
      await api.patch(`/contas/${id}`)
      await carregarDashboard()
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como paga.')
    } finally {
      setActionLoading(null)
    }
  }

  const excluirCompra = async (id) => {
    if (!confirm('Excluir esta compra?')) return
    setActionLoading(id)
    try {
      await api.delete(`/compras-cartao/${id}`)
      await carregarDashboard()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir compra.')
    } finally {
      setActionLoading(null)
    }
  }

  const cards = data ? [
    { titulo: 'Receitas no período', valor: fmt(data.receitas), cor: 'bg-green-500' },
    { titulo: 'Despesas no período', valor: fmt(data.despesas), cor: 'bg-red-500' },
    { titulo: 'Saldo acumulado', valor: fmt(data.saldo), cor: 'bg-blue-500' },
    { titulo: 'Taxa de economia', valor: `${Math.round(data.meta_economia)}%`, cor: 'bg-purple-500' },
  ] : []

  const patrimonioCard = patrimonioData ? {
    titulo: 'Patrimônio Líquido',
    valor: fmt(patrimonioData.patrimonio),
    ativos: fmt(patrimonioData.ativos),
    passivos: fmt(patrimonioData.passivos)
  } : null

  if (loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='text-gray-400 text-xl animate-pulse'>Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Dashboard</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Visão geral da sua gestão financeira</p>
          <p className='text-gray-500 mt-1 text-xs'>
            {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Atualizando dados...'}
          </p>
        </div>
        
        {/* Card de Patrimônio Líquido */}
        {patrimonioCard && (
          <div className='bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-gray-700/50 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-xl'>
            <div className='text-center md:text-left'>
              <span className='text-[10px] text-gray-400 uppercase tracking-widest font-bold'>Total do Patrimônio</span>
              <h2 className={`text-2xl font-black mt-1 ${patrimonioData.patrimonio >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {patrimonioCard.valor}
              </h2>
            </div>
            <div className='h-px md:h-10 w-full md:w-px bg-gray-700'></div>
            <div className='flex gap-8'>
              <div className='text-center md:text-left'>
                <span className='text-[10px] text-gray-500 uppercase font-bold'>Ativos</span>
                <p className='text-sm text-white font-semibold'>{patrimonioCard.ativos}</p>
              </div>
              <div className='text-center md:text-left'>
                <span className='text-[10px] text-gray-500 uppercase font-bold'>Passivos</span>
                <p className='text-sm text-white font-semibold'>{patrimonioCard.passivos}</p>
              </div>
            </div>
          </div>
        )}
        <div className='flex flex-wrap items-center gap-3 bg-[#0d1a2d]/80 backdrop-blur-md p-2 rounded-2xl border border-gray-800 shadow-2xl'>
          {/* Botão de Atalho: Mês Atual */}
          <button
            onClick={() => {
              const d = new Date()
              setMesSelecionado(d.getMonth())
              setAnoSelecionado(d.getFullYear())
              setMesFim(d.getMonth())
              setAnoFim(d.getFullYear())
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mesSelecionado === mesFim && anoSelecionado === anoFim && mesSelecionado === new Date().getMonth()
                ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            Este Mês
          </button>

          {/* Botão de Atalho: Últimos 3 Meses */}
          <button
            onClick={() => {
              const d = new Date()
              setMesFim(d.getMonth())
              setAnoFim(d.getFullYear())
              let mDe = d.getMonth() - 2
              let aDe = d.getFullYear()
              if (mDe < 0) { mDe += 12; aDe -= 1 }
              setMesSelecionado(mDe)
              setAnoSelecionado(aDe)
            }}
            className='px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all'
          >
            Últimos 3 Meses
          </button>

          <div className='h-6 w-px bg-gray-800 mx-1'></div>

          {/* Seletores Customizados mais limpos */}
          <div className='flex items-center gap-2 px-2'>
            <div className='flex items-center gap-1 bg-[#111f34] border border-gray-700/50 rounded-xl px-2 py-1'>
              <span className='text-[10px] text-gray-500 font-bold ml-1'>DE:</span>
              <select 
                value={mesSelecionado} 
                onChange={e => setMesSelecionado(Number(e.target.value))}
                className='bg-transparent text-white text-xs outline-none cursor-pointer py-1'
              >
                {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m.substring(0, 3)}</option>)}
              </select>
              <select 
                value={anoSelecionado} 
                onChange={e => setAnoSelecionado(Number(e.target.value))}
                className='bg-transparent text-white text-xs outline-none cursor-pointer py-1'
              >
                {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a} className='bg-[#111f34]'>{a}</option>)}
              </select>
            </div>

            <div className='text-gray-600'>→</div>

            <div className='flex items-center gap-1 bg-[#111f34] border border-gray-700/50 rounded-xl px-2 py-1'>
              <span className='text-[10px] text-gray-500 font-bold ml-1'>ATÉ:</span>
              <select 
                value={mesFim} 
                onChange={e => setMesFim(Number(e.target.value))}
                className='bg-transparent text-white text-xs outline-none cursor-pointer py-1'
              >
                {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m.substring(0, 3)}</option>)}
              </select>
              <select 
                value={anoFim} 
                onChange={e => setAnoFim(Number(e.target.value))}
                className='bg-transparent text-white text-xs outline-none cursor-pointer py-1'
              >
                {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a} className='bg-[#111f34]'>{a}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => carregarDashboard()}
            disabled={refreshing}
            className='ml-2 p-2 bg-green-500 hover:bg-green-400 text-black rounded-xl transition-all shadow-lg shadow-green-500/20 disabled:opacity-50'
            title='Aplicar Filtro'
          >
            {refreshing ? (
              <div className='w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin'></div>
            ) : (
              '🔍'
            )}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className='grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8'>
        {cards.map((card, i) => (
          <div key={i} className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 shadow-lg hover:border-gray-600 transition-all duration-300'>
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl ${card.cor} mb-3 md:mb-5 flex items-center justify-center text-xl md:text-2xl`}>
              {['💰', '💸', '📊', '🎯'][i]}
            </div>
            <p className='text-gray-400 text-xs md:text-base'>{card.titulo}</p>
            <h2 className='text-xl md:text-3xl font-bold mt-1 md:mt-2'>{card.valor}</h2>
          </div>
        ))}
      </div>

      {/* Consultor de IA (Insights) */}
      {insights.length > 0 && (
        <div className='mb-10 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl'>
          <div className='absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl'></div>
          <div className='flex items-center gap-3 mb-6'>
            <div className='flex items-center justify-center w-10 h-10 bg-green-500 text-black rounded-xl text-xl font-black shadow-lg shadow-green-500/20'>
              AI
            </div>
            <h2 className='text-xl font-bold'>Insights do Consultor</h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {insights.map((insight, i) => (
              <div key={i} className='flex gap-4 items-center bg-[#0d1a2d]/60 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:border-white/10 transition group'>
                <span className='text-3xl group-hover:scale-110 transition-transform'>{insight.icon}</span>
                <p className='text-sm text-gray-300 leading-relaxed'>{insight.msg}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8'>
        <div className='xl:col-span-2 bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-lg md:text-2xl font-bold'>Receitas x Despesas</h2>
            <select className='bg-[#132238] border border-gray-700 rounded-lg px-3 py-1 md:px-4 md:py-2 text-white text-sm'>
              <option>12 meses</option>
              <option>6 meses</option>
            </select>
          </div>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid stroke='#1f2b42' vertical={false} />
                <XAxis dataKey='name' stroke='#829ab1' />
                <YAxis stroke='#829ab1' />
                <Tooltip
                  contentStyle={{ background: '#0b1728', border: '1px solid #334155', borderRadius: '12px' }}
                  formatter={(value) => fmt(value)}
                />
                <Bar dataKey='receitas' fill='#22c55e' radius={[6, 6, 0, 0]} name='Receitas' />
                <Bar dataKey='despesas' fill='#ef4444' radius={[6, 6, 0, 0]} name='Despesas' />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold'>Despesas por Categoria</h2>
            {categoriaFiltro && (
              <button onClick={() => setCategoriaFiltro(null)} className='text-xs text-blue-400 hover:underline'>Limpar Filtro</button>
            )}
          </div>
          <div className='space-y-5'>
            {(data?.categorias || []).map((cat, i) => (
              <div 
                key={i} 
                className={`cursor-pointer group ${categoriaFiltro && categoriaFiltro !== cat.nome ? 'opacity-40' : 'opacity-100'}`}
                onClick={() => setCategoriaFiltro(categoriaFiltro === cat.nome ? null : cat.nome)}
              >
                <div className='flex justify-between mb-2'>
                  <span className='group-hover:text-green-400 transition'>{cat.nome}</span>
                  <span className='font-bold'>{cat.percentual}%</span>
                </div>
                <div className='w-full h-3 bg-[var(--bg-input)] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-700'
                    style={{ width: `${cat.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8'>
        {/* Contas a Pagar */}
        <div className='bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]'>
          <h2 className='text-2xl font-bold mb-6'>Contas a Pagar {categoriaFiltro && <span className='text-sm font-normal text-blue-400'>({categoriaFiltro})</span>}</h2>
          <div className='space-y-4'>
            {(data?.contas_pagar || [])
              .filter(c => !categoriaFiltro || c.categoria_nome === categoriaFiltro)
              .map((conta, i) => (
              <div key={i} className='flex justify-between items-center bg-[var(--bg-input)] p-4 rounded-xl border border-transparent hover:border-gray-700 transition'>
                <div className='flex-1'>
                  <span className='block font-medium'>{conta.descricao}</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-yellow-400 font-bold'>{fmt(conta.valor)}</span>
                    <span className='text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded'>{conta.categoria_nome}</span>
                  </div>
                </div>
                <div className='flex gap-2 ml-4'>
                  <button
                    onClick={() => marcarPaga(conta.id)}
                    disabled={actionLoading === conta.id}
                    className='bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition text-sm disabled:opacity-50'
                  >
                    {actionLoading === conta.id ? '...' : 'Pagar'}
                  </button>
                </div>
              </div>
            ))}
            {(!data?.contas_pagar || data.contas_pagar.length === 0) && (
              <p className='text-gray-500'>Nenhuma conta pendente</p>
            )}
          </div>
        </div>

        {/* Compras no Cartão */}
        <div className='bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]'>
          <h2 className='text-2xl font-bold mb-6'>Compras no Cartão {categoriaFiltro && <span className='text-sm font-normal text-blue-400'>({categoriaFiltro})</span>}</h2>
          <div className='overflow-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='text-[var(--text-muted)] border-b border-[var(--border-color)]'>
                  <th className='pb-3 text-xs uppercase'>Compra</th>
                  <th className='pb-3 text-xs uppercase'>Valor</th>
                  <th className='pb-3 text-xs uppercase'>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data?.compras_cartao || [])
                  .map((c, i) => (
                  <tr key={i} className='border-b border-[var(--border-color)] last:border-0'>
                    <td className='py-4'>
                      <span className='block font-medium'>{c.descricao}</span>
                      <span className='text-[10px] text-gray-500'>{c.cartao_nome} - {c.parcela_atual}/{c.parcelas}x</span>
                    </td>
                    <td className='text-green-400 font-bold'>{fmt(c.valor)}</td>
                    <td className='py-4'>
                      <button
                        onClick={() => excluirCompra(c.id)}
                        disabled={actionLoading === c.id}
                        className='text-red-400 hover:text-red-300 transition text-sm disabled:opacity-50'
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metas */}
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Minhas Metas</h2>
          <div className='space-y-6'>
            {(data?.metas || []).map((meta, i) => (
              <div key={i}>
                <div className='flex justify-between mb-2'>
                  <span>{meta.titulo}</span>
                  <span className='text-green-400'>{meta.progresso}%</span>
                </div>
                <div className='w-full h-4 bg-[#15253d] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-green-500 transition-all duration-700'
                    style={{ width: `${meta.progresso}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gamificação - Conquistas */}
      {patrimonioData?.conquistas && (
        <div className='mt-10 mb-20 md:mb-10'>
          <h2 className='text-xl font-bold mb-6 flex items-center gap-2'>
            <span>🏆</span> Minhas Conquistas
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {patrimonioData.conquistas.map(c => (
              <div 
                key={c.id} 
                className={`p-4 rounded-2xl border transition-all duration-500 hover:scale-[1.02] ${
                  c.ganho 
                    ? 'bg-green-500/5 border-green-500/20 opacity-100' 
                    : 'bg-gray-800/10 border-gray-800/30 opacity-40 grayscale'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${
                    c.ganho ? 'bg-green-500/20' : 'bg-gray-700/30'
                  }`}>
                    {c.icon}
                  </div>
                  <div className='flex-1'>
                    <h3 className={`font-bold text-sm ${c.ganho ? 'text-green-400' : 'text-gray-400'}`}>
                      {c.titulo}
                    </h3>
                    <p className='text-[10px] text-gray-500 mt-0.5 leading-tight'>{c.desc}</p>
                  </div>
                </div>
                {c.ganho && (
                  <div className='mt-3 h-1 w-full bg-green-500/10 rounded-full overflow-hidden'>
                    <div className='h-full bg-green-500 w-full animate-pulse'></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className='mt-10 mb-24 md:mb-10 text-center text-gray-500 text-sm'>
        Dashboard Financeiro Pessoal • Desenvolvido em React + TailwindCSS
      </footer>
    </>
  )
}

