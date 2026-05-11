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
  const [actionLoading, setActionLoading] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
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
  
  const pieData = (data?.categorias || []).map(c => ({ name: c.nome, value: Number(c.valor) }))
  const conquistas = patrimonioData?.conquistas || []

  const cards = data ? [
    { titulo: 'Receitas no período', valor: fmt(data.receitas), cor: 'bg-green-500', icone: '💰' },
    { titulo: 'Despesas no período', valor: fmt(data.despesas), cor: 'bg-red-500', icone: '💸' },
    { titulo: 'Saldo acumulado', valor: fmt(data.saldo), cor: 'bg-blue-500', icone: '📊' },
    { titulo: 'Taxa de economia', valor: `${Math.round(data.meta_economia)}%`, cor: 'bg-purple-500', icone: '🎯' },
  ] : []

  if (loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='text-gray-400 text-xl animate-pulse'>Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0'>
      {/* Header e Filtros Minimalistas */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8'>
        <div>
          <h1 className='text-3xl md:text-5xl font-black text-white tracking-tighter'>Dashboard</h1>
          <p className='text-gray-500 font-medium text-sm md:text-base'>Sua saúde financeira em tempo real</p>
        </div>

        <div className='relative'>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-bold text-sm ${
              showFilters ? 'bg-green-500 text-black border-green-500 shadow-lg' : 'bg-[#0d1a2d] border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            <span>{showFilters ? '✕ Fechar' : '🔍 Filtrar Período'}</span>
          </button>

          {showFilters && (
            <div className='absolute top-16 right-0 z-50 min-w-[320px] bg-[#0d1a2d] border border-gray-800 p-6 rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200'>
              <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='space-y-2'>
                  <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1'>Início</span>
                  <div className='flex flex-col gap-2 bg-[#111f34] p-3 rounded-2xl border border-gray-700/30'>
                    <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                      {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m}</option>)}
                    </select>
                    <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none font-bold'>
                      {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a} className='bg-[#111f34]'>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className='space-y-2'>
                  <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1'>Fim</span>
                  <div className='flex flex-col gap-2 bg-[#111f34] p-3 rounded-2xl border border-gray-700/30'>
                    <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                      {mesesNomes.map((m, i) => <option key={i} value={i} className='bg-[#111f34]'>{m}</option>)}
                    </select>
                    <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none font-bold'>
                      {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a} className='bg-[#111f34]'>{a}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { carregarDashboard(); setShowFilters(false); }}
                className='w-full bg-green-500 text-black font-black py-4 rounded-xl hover:bg-green-400 transition shadow-lg shadow-green-500/20'
              >
                APLICAR FILTRO
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação por Abas Premium */}
      <div className='flex gap-1 bg-[#0d1a2d] p-2 rounded-[2rem] border border-gray-800 mb-10 max-w-lg'>
        {[
          { id: 'resumo', label: 'Resumo', icon: '📊' },
          { id: 'ia', label: 'IA & Análise', icon: '🤖' },
          { id: 'conquistas', label: 'Troféus', icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id ? 'bg-green-500 text-black shadow-lg shadow-green-500/10' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className='hidden sm:inline'>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo Dinâmico */}
      {activeTab === 'resumo' && (
        <div className='animate-in fade-in duration-500 space-y-10'>
          {/* Patrimônio Líquido */}
          {patrimonioData && (
            <div className='bg-gradient-to-br from-[#1e293b] to-[#080f1e] border border-gray-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group'>
              <div className='absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity'>
                <span className='text-9xl'>🏦</span>
              </div>
              <div className='flex flex-col md:flex-row md:items-end justify-between gap-10'>
                <div>
                  <span className='text-[10px] text-green-400 font-black tracking-[0.3em] uppercase mb-3 block'>Patrimônio Consolidado</span>
                  <div className='flex items-baseline gap-3'>
                    <span className='text-3xl text-gray-500 font-light'>R$</span>
                    <h2 className={`text-5xl md:text-8xl font-black tracking-tighter ${patrimonioData.patrimonio >= 0 ? 'text-white' : 'text-red-400'}`}>
                      {Number(patrimonioData.patrimonio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h2>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-10 border-t md:border-t-0 md:border-l border-gray-800 pt-10 md:pt-0 md:pl-10'>
                  <div><span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>Ativos</span><p className='text-2xl text-white font-black'>{fmt(patrimonioData.ativos)}</p></div>
                  <div><span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>Dívidas</span><p className='text-2xl text-red-400/80 font-black'>{fmt(patrimonioData.passivos)}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Cards de Resumo */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
            {cards.map((card, i) => (
              <div key={i} className='bg-[#0d1a2d] rounded-[2.5rem] p-8 border border-gray-800 hover:border-gray-600 transition-all shadow-xl group'>
                <div className={`w-16 h-16 rounded-[1.5rem] ${card.cor} mb-6 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                   {card.icone}
                </div>
                <p className='text-gray-500 text-[10px] font-black uppercase tracking-[0.1em] mb-2'>{card.titulo}</p>
                <h3 className='text-2xl md:text-3xl font-black text-white'>{card.valor}</h3>
              </div>
            ))}
          </div>

          {/* Seção de Gráficos */}
          <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
             <div className='xl:col-span-2 bg-[#0d1a2d] rounded-[3rem] p-8 border border-gray-800 shadow-2xl'>
                <h3 className='text-2xl font-black text-white mb-8'>Evolução Financeira</h3>
                <div className='h-80 w-full'>
                   <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id='colorRec' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#22c55e' stopOpacity={0.3}/>
                          <stop offset='95%' stopColor='#22c55e' stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id='colorDes' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#ef4444' stopOpacity={0.3}/>
                          <stop offset='95%' stopColor='#ef4444' stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey='mes' stroke='#4b5563' fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d1a2d', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <Area type='monotone' dataKey='receitas' stroke='#22c55e' strokeWidth={4} fillOpacity={1} fill='url(#colorRec)' />
                      <Area type='monotone' dataKey='despesas' stroke='#ef4444' strokeWidth={4} fillOpacity={1} fill='url(#colorDes)' />
                    </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className='bg-[#0d1a2d] rounded-[3rem] p-8 border border-gray-800 shadow-2xl'>
                <h3 className='text-2xl font-black text-white mb-8'>Maiores Gastos</h3>
                <div className='h-80 w-full'>
                   <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx='50%'
                          cy='50%'
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey='value'
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'ia' && (
        <div className='animate-in slide-in-from-right-10 fade-in duration-500 space-y-8'>
          <div className='bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-[3rem] p-10 relative overflow-hidden'>
             <div className='flex items-center gap-4 mb-10'>
                <div className='w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-black font-black text-2xl shadow-2xl shadow-green-500/20'>AI</div>
                <h2 className='text-3xl font-black text-white'>Análise Estratégica Gemini</h2>
             </div>
             <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {insights.map((insight, i) => (
                  <div key={i} className='bg-[#0b1728]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 hover:border-green-500/30 transition-all group'>
                    <span className='text-5xl block mb-6 group-hover:scale-110 transition-transform'>{insight.icon}</span>
                    <p className='text-lg text-gray-200 font-medium leading-relaxed'>{insight.msg}</p>
                  </div>
                ))}
             </div>
             {insights.length === 0 && (
               <div className='text-center py-20'>
                  <p className='text-gray-400 italic'>Sua IA está analisando os dados... Tente filtrar um período com movimentações.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'conquistas' && (
        <div className='animate-in slide-in-from-right-10 fade-in duration-500'>
          <div className='bg-[#0d1a2d] border border-gray-800 rounded-[3rem] p-10'>
             <div className='flex items-center gap-4 mb-12'>
                <span className='text-5xl'>🏆</span>
                <h2 className='text-3xl font-black text-white uppercase tracking-tighter'>Sala de Troféus</h2>
             </div>
             <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8'>
                {conquistas.map((c, i) => (
                  <div key={i} className={`p-8 rounded-[2.5rem] border transition-all duration-700 flex flex-col items-center text-center ${c.desbloqueado || c.ganho ? 'bg-green-500/5 border-green-500/30 shadow-2xl' : 'bg-gray-900/50 border-gray-800 opacity-30 grayscale'}`}>
                     <span className='text-6xl mb-6 transform group-hover:scale-125 transition-transform'>{c.icone || c.icon}</span>
                     <h4 className='font-black text-white text-sm mb-2 uppercase tracking-widest'>{c.titulo}</h4>
                     <p className='text-xs text-gray-500 font-medium leading-tight'>{c.descricao || c.desc}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
