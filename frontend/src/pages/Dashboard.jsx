import { useCallback, useEffect, useState } from 'react'
import api from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'

const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())
  const [mesFim, setMesFim] = useState(now.getMonth())
  const [anoFim, setAnoFim] = useState(now.getFullYear())
  const [refreshing, setRefreshing] = useState(false)
  const [patrimonioData, setPatrimonioData] = useState(null)
  const [insights, setInsights] = useState([])
  const [activeTab, setActiveTab] = useState('resumo')
  const [showFilters, setShowFilters] = useState(false)

  const carregarDashboard = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true)
    setRefreshing(true)
    try {
      const res = await api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`)
      setData(res.data)
    } catch (e) {
      console.error(e)
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

  const chartData = (data?.historico || mesesLabel.map(m => ({ name: m, receitas: 0, despesas: 0 })))
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  
  const pieData = (data?.categorias || []).map(c => ({ name: c.nome, value: Number(c.valor) }))
  const conquistas = patrimonioData?.conquistas || []

  const cards = data ? [
    { titulo: 'Receitas', valor: fmt(data.receitas), cor: 'bg-green-500/10 text-green-400', icone: '💰' },
    { titulo: 'Despesas', valor: fmt(data.despesas), cor: 'bg-red-500/10 text-red-400', icone: '💸' },
    { titulo: 'Saldo', valor: fmt(data.saldo), cor: 'bg-blue-500/10 text-blue-400', icone: '📊' },
    { titulo: 'Economia', valor: `${Math.round(data.meta_economia)}%`, cor: 'bg-purple-500/10 text-purple-400', icone: '🎯' },
  ] : []

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0 animate-pulse'>
        <div className='h-10 w-48 bg-gray-800 rounded-2xl mb-12'></div>
        <div className='h-40 w-full bg-gray-800 rounded-[2rem] mb-8'></div>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10'>
          {[1,2,3,4].map(i => <div key={i} className='h-32 bg-gray-800 rounded-2xl'></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0'>
      {/* Header Minimalista */}
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-black text-white tracking-tighter'>Dashboard</h1>
          <p className='text-gray-500 text-xs font-bold uppercase tracking-widest'>Visão Consolidada</p>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className='p-3 bg-[#0d1a2d] border border-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all'
        >
          {showFilters ? '✕' : '📅'}
        </button>
      </div>

      {showFilters && (
        <div className='mb-8 p-6 bg-[#0d1a2d] border border-gray-800 rounded-[2rem] animate-in fade-in slide-in-from-top-4 duration-300'>
          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div className='space-y-1'>
              <span className='text-[10px] text-gray-500 font-black uppercase ml-1'>Período Inicial</span>
              <div className='flex gap-2 bg-[#111f34] p-3 rounded-xl border border-gray-700/30'>
                <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                  {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m}</option>)}
                </select>
              </div>
            </div>
            <div className='space-y-1'>
              <span className='text-[10px] text-gray-500 font-black uppercase ml-1'>Período Final</span>
              <div className='flex gap-2 bg-[#111f34] p-3 rounded-xl border border-gray-700/30'>
                <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                  {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={() => { carregarDashboard(); setShowFilters(false); }} className='w-full bg-green-500 text-black font-black py-3 rounded-xl text-sm'>APLICAR FILTROS</button>
        </div>
      )}

      {/* Patrimônio Líquido Compacto e Elegante */}
      {patrimonioData && (
        <div className='mb-8'>
          <div className='bg-gradient-to-br from-[#1e293b] to-[#080f1e] border border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10'>
              <div className='text-center md:text-left'>
                <span className='text-[10px] text-green-400 font-black tracking-[0.2em] uppercase mb-1 block'>Patrimônio Líquido</span>
                <h2 className='text-4xl md:text-6xl font-black text-white tracking-tighter'>
                  {fmt(patrimonioData.patrimonio)}
                </h2>
              </div>
              <div className='flex justify-around md:justify-end gap-8 border-t md:border-t-0 md:border-l border-gray-800/50 pt-6 md:pt-0 md:pl-8'>
                <div className='text-center'>
                  <span className='text-[9px] text-gray-500 font-black uppercase block mb-1'>Ativos</span>
                  <p className='text-base text-white font-black'>{fmt(patrimonioData.ativos)}</p>
                </div>
                <div className='text-center'>
                  <span className='text-[9px] text-gray-500 font-black uppercase block mb-1'>Dívidas</span>
                  <p className='text-base text-red-400/80 font-black'>{fmt(patrimonioData.passivos)}</p>
                </div>
              </div>
            </div>
            <div className='absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-8xl'>🏦</div>
          </div>
        </div>
      )}

      {/* Grid de Cards Ajustado para Mobile */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8'>
        {cards.map((card, i) => (
          <div key={i} className='bg-[#0d1a2d] rounded-3xl p-5 border border-gray-800 hover:border-gray-600 transition-all shadow-xl group flex flex-col items-center text-center'>
            <div className={`w-12 h-12 rounded-2xl ${card.cor} mb-3 flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}>
               {card.icone}
            </div>
            <p className='text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1'>{card.titulo}</p>
            <h3 className='text-lg md:text-xl font-black text-white truncate w-full'>{card.valor}</h3>
          </div>
        ))}
      </div>

      {/* Navegação por Abas */}
      <div className='flex gap-1 bg-[#0d1a2d] p-1.5 rounded-2xl border border-gray-800 mb-8 max-w-sm mx-auto'>
        {['resumo', 'ia', 'conquistas'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-green-500 text-black shadow-lg' : 'text-gray-500'
            }`}
          >
            {tab === 'resumo' ? 'Dados' : tab === 'ia' ? 'IA' : 'Troféus'}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'resumo' && (
        <div className='animate-in fade-in duration-500 space-y-6'>
          <div className='bg-[#0d1a2d] rounded-[2rem] p-6 border border-gray-800 shadow-2xl'>
            <h3 className='text-xl font-black text-white mb-6'>Fluxo de Caixa</h3>
            <div className='h-64 w-full'>
               <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id='colorRec' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#22c55e' stopOpacity={0.2}/>
                      <stop offset='95%' stopColor='#22c55e' stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey='mes' hide />
                  <Tooltip contentStyle={{ backgroundColor: '#0d1a2d', border: 'none', borderRadius: '15px' }} />
                  <Area type='monotone' dataKey='receitas' stroke='#22c55e' strokeWidth={3} fillOpacity={1} fill='url(#colorRec)' />
                  <Area type='monotone' dataKey='despesas' stroke='#ef4444' strokeWidth={3} fillOpacity={0} />
                </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ia' && (
        <div className='animate-in slide-in-from-right-10 fade-in duration-500 space-y-4'>
           {insights.map((insight, i) => (
              <div key={i} className='bg-gradient-to-r from-green-500/5 to-blue-500/5 p-6 rounded-[2rem] border border-white/5 flex gap-4 items-center'>
                <span className='text-3xl'>{insight.icon}</span>
                <p className='text-sm text-gray-300 font-medium leading-tight'>{insight.msg}</p>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'conquistas' && (
        <div className='animate-in slide-in-from-right-10 fade-in duration-500 grid grid-cols-2 gap-4'>
            {conquistas.map((c, i) => (
              <div key={i} className={`p-6 rounded-[2rem] border flex flex-col items-center text-center ${c.desbloqueado || c.ganho ? 'bg-green-500/5 border-green-500/20' : 'bg-gray-900/50 border-gray-800 opacity-30 grayscale'}`}>
                 <span className='text-4xl mb-3'>{c.icone || c.icon}</span>
                 <h4 className='font-black text-white text-[10px] uppercase tracking-tighter'>{c.titulo}</h4>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
