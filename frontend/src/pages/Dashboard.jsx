import { useCallback, useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
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
  }, [carregarDashboard])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        carregarDashboard()
      }
    }

    const interval = setInterval(refreshIfVisible, 3000)
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

  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center h-96'>
          <div className='text-gray-400 text-xl animate-pulse'>Carregando dashboard...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Dashboard</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Visão geral da sua gestão financeira</p>
          <p className='text-gray-500 mt-1 text-xs'>
            {lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Atualizando dados...'}
          </p>
        </div>
        <div className='flex flex-wrap gap-4 items-center'>
          <button
            onClick={() => carregarDashboard()}
            disabled={refreshing}
            className='bg-[#111f34] border border-gray-700 px-4 py-2 rounded-xl text-white hover:border-green-500/50 hover:text-green-400 transition disabled:opacity-60 text-xs md:text-sm'
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500 uppercase'>De:</span>
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'
            >
              {mesesNomes.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500 uppercase'>Até:</span>
            <select
              value={mesFim}
              onChange={(e) => setMesFim(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'
            >
              {mesesNomes.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={anoFim}
              onChange={(e) => setAnoFim(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
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

        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Despesas por Categoria</h2>
          <div className='space-y-5'>
            {(data?.categorias || []).map((cat, i) => (
              <div key={i}>
                <div className='flex justify-between mb-2'>
                  <span>{cat.nome}</span>
                  <span>{cat.percentual}%</span>
                </div>
                <div className='w-full h-3 bg-[#15253d] rounded-full overflow-hidden'>
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
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Contas a Pagar</h2>
          <div className='space-y-4'>
            {(data?.contas_pagar || []).map((conta, i) => (
              <div key={i} className='flex justify-between items-center bg-[#132238] p-4 rounded-xl'>
                <div className='flex-1'>
                  <span className='block'>{conta.descricao}</span>
                  <span className='text-yellow-400 font-semibold'>{fmt(conta.valor)}</span>
                </div>
                <div className='flex gap-2 ml-4'>
                  <button
                    onClick={() => marcarPaga(conta.id)}
                    disabled={actionLoading === conta.id}
                    className='text-green-400 hover:text-green-300 transition text-sm disabled:opacity-50'
                  >
                    {actionLoading === conta.id ? 'Pagando...' : 'Pagar'}
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
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Compras no Cartão</h2>
          <div className='overflow-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='text-gray-400 border-b border-gray-700'>
                  <th className='pb-3'>Compra</th>
                  <th className='pb-3'>Parcelas</th>
                  <th className='pb-3'>Valor</th>
                  <th className='pb-3'>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data?.compras_cartao || []).map((c, i) => (
                  <tr key={i} className='border-b border-gray-800'>
                    <td className='py-4'>{c.descricao}</td>
                    <td>{c.parcelas}</td>
                    <td className='text-green-400'>{fmt(c.valor)}</td>
                    <td className='py-4'>
                      <button
                        onClick={() => excluirCompra(c.id)}
                        disabled={actionLoading === c.id}
                        className='text-red-400 hover:text-red-300 transition text-sm disabled:opacity-50'
                      >
                        {actionLoading === c.id ? 'Excluindo...' : 'Excluir'}
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

      <footer className='mt-10 text-center text-gray-500 text-sm'>
        Dashboard Financeiro Pessoal • Desenvolvido em React + TailwindCSS
      </footer>
    </Layout>
  )
}
