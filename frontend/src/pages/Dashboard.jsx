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
  const [data, setData] = useState({
    receitas: 0, despesas: 0, saldo: 0, meta_economia: 0,
    categorias: [],
    contas_pagar: [],
    compras_cartao: [],
    metas: [],
    historico: mesesLabel.map(m => ({ name: m, receitas: 0, despesas: 0 }))
  })
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
  const [patrimonioData, setPatrimonioData] = useState({
    patrimonio: 0,
    ativos: 0,
    passivos: 0,
    conquistas: []
  })
  const [insights, setInsights] = useState([])
  const [activeTab, setActiveTab] = useState('resumo')
  const [showFilters, setShowFilters] = useState(false)

  const carregarDashboard = useCallback(async (opt = {}) => {
    if (opt.showLoading) setLoading(true)
    setRefreshing(true)
    try {
      const res = await api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`)
      if (res.data) setData(res.data)
      
      const pat = await api.get('/patrimonio')
      if (pat.data) setPatrimonioData(pat.data)
      
      const ins = await api.get('/insights')
      if (ins.data) setInsights(ins.data)
      
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
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

  const chartData = data?.historico || []
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  
  const pieData = (data?.categorias || []).map(c => ({ name: c.nome, value: Number(c.total) }))
  const conquistas = patrimonioData?.conquistas || []

  const cards = [
    { titulo: 'Receitas no período', valor: fmt(data?.receitas || 0), cor: 'bg-green-500/10 text-green-500', icone: '💰' },
    { titulo: 'Despesas no período', valor: fmt(data?.despesas || 0), cor: 'bg-red-500/10 text-red-500', icone: '💸' },
    { titulo: 'Saldo acumulado', valor: fmt(data?.saldo || 0), cor: 'bg-blue-500/10 text-blue-500', icone: '📊' },
    { titulo: 'Taxa de economia', valor: `${Math.round(data?.meta_economia || 0)}%`, cor: 'bg-purple-500/10 text-purple-500', icone: '🎯' },
  ]

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0 animate-pulse'>
        {/* Header Skeleton */}
        <div className='flex justify-between items-center mb-12'>
          <div className='space-y-3'>
            <div className='h-12 w-64 bg-gray-800 rounded-2xl'></div>
            <div className='h-4 w-40 bg-gray-800 rounded-lg'></div>
          </div>
          <div className='h-14 w-40 bg-gray-800 rounded-2xl'></div>
        </div>

        {/* AI Banner Skeleton */}
        <div className='h-32 w-full bg-gray-800 rounded-[2.5rem] mb-10'></div>

        {/* Patrimonio + Score Skeleton */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10'>
          <div className='lg:col-span-2 h-80 bg-gray-800 rounded-[3rem]'></div>
          <div className='h-80 bg-gray-800 rounded-[3rem]'></div>
        </div>

        {/* Cards Skeleton */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10'>
          {[1,2,3,4].map(i => <div key={i} className='h-48 bg-gray-800 rounded-[2.5rem]'></div>)}
        </div>
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
      
      {/* AI Proactive Insight Banner */}
      {insights.length > 0 && (
        <div className='mb-10 animate-in fade-in slide-in-from-top-4 duration-700'>
          <div className='bg-gradient-to-r from-[#1e293b] to-[#0f172a] border border-green-500/30 rounded-[2.5rem] p-1 flex items-center shadow-2xl overflow-hidden group'>
            <div className='bg-green-500 text-black font-black px-6 py-8 rounded-[2.2rem] flex flex-col items-center justify-center gap-1 shadow-lg group-hover:scale-105 transition-transform'>
              <span className='text-xs uppercase tracking-tighter'>Insight</span>
              <span className='text-3xl'>🤖</span>
            </div>
            <div className='px-8 flex-1'>
              <p className='text-gray-300 text-lg font-medium leading-tight group-hover:text-white transition-colors'>
                {insights[0].msg}
              </p>
              <div className='flex gap-4 mt-3'>
                <span className='text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full'>Dica do Gemini</span>
                <span className='text-[10px] text-gray-500 font-bold uppercase tracking-widest'>• {mesesNomes[mesSelecionado]}</span>
              </div>
            </div>
            <div className='hidden md:block pr-8 opacity-20 group-hover:opacity-40 transition-opacity'>
               <span className='text-7xl grayscale'>{insights[0].icon}</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Status da Conexão e Cards de Resumo */}
      <div className='space-y-6 mb-10'>
        {refreshing && (
          <div className='flex items-center gap-2 text-[10px] text-green-500 font-black uppercase tracking-widest animate-pulse'>
            <span className='w-2 h-2 bg-green-500 rounded-full'></span>
            Sincronizando dados...
          </div>
        )}
        
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
          {cards.map((card, i) => (
            <div key={i} className='bg-[#0d1a2d] rounded-[2.5rem] p-8 border border-gray-800 hover:border-gray-600 transition-all shadow-xl group flex flex-col items-center text-center'>
              <div className={`w-16 h-16 rounded-[1.5rem] ${card.cor.split(' ')[0]} mb-6 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform ${card.cor.split(' ')[1]}`}>
                 {card.icone}
              </div>
              <p className='text-gray-500 text-[10px] font-black uppercase tracking-[0.1em] mb-2'>{card.titulo}</p>
              <h3 className='text-2xl md:text-3xl font-black text-white'>{card.valor}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo Dinâmico */}
      {activeTab === 'resumo' && (
        <div className='fade-in duration-500 space-y-10'>
          {/* Patrimônio e Score - Grid Combinado */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Patrimônio Líquido */}
            {patrimonioData && (
              <div className='lg:col-span-2 bg-gradient-to-br from-[#1e293b] to-[#080f1e] border border-gray-800 p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group h-full flex flex-col justify-center'>
                <div className='relative z-10'>
                  <span className='text-[10px] text-green-400 font-black tracking-[0.3em] uppercase mb-4 block'>Patrimônio Consolidado</span>
                  <div className='flex items-baseline gap-4 mb-10'>
                    <span className='text-3xl text-gray-500 font-light'>R$</span>
                    <h2 className={`text-5xl md:text-8xl font-black tracking-tighter ${patrimonioData.patrimonio >= 0 ? 'text-white' : 'text-red-400'}`}>
                      {fmt(patrimonioData.patrimonio).replace('R$', '').trim()}
                    </h2>
                  </div>
                  
                  <div className='grid grid-cols-2 gap-10 border-t border-gray-800/50 pt-10 max-w-md'>
                    <div>
                      <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2'>Total em Ativos</span>
                      <p className='text-2xl text-white font-black'>{fmt(patrimonioData.ativos)}</p>
                    </div>
                    <div>
                      <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2'>Total em Dívidas</span>
                      <p className='text-2xl text-red-400/80 font-black'>{fmt(patrimonioData.passivos)}</p>
                    </div>
                  </div>
                </div>
                <div className='absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity text-[15rem]'>🏦</div>
              </div>
            )}

            {/* Score de Saúde Financeira */}
            <div className='bg-[#0d1a2d] border border-gray-800 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group'>
               <span className='text-[10px] text-purple-400 font-black tracking-[0.3em] uppercase mb-8 block relative z-10'>Financial Health Score</span>
               
               <div className='relative w-48 h-48 flex items-center justify-center mb-8'>
                  <svg className='w-full h-full transform -rotate-90'>
                    <circle cx='96' cy='96' r='88' stroke='currentColor' strokeWidth='12' fill='transparent' className='text-gray-800' />
                    <circle cx='96' cy='96' r='88' stroke='currentColor' strokeWidth='12' fill='transparent' strokeDasharray={552.92} strokeDashoffset={552.92 - (552.92 * (data?.meta_economia > 0 ? data.meta_economia : 10)) / 100} className='text-green-500 transition-all duration-1000' />
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                     <span className='text-5xl font-black text-white'>{Math.round(data?.meta_economia > 0 ? data.meta_economia : 15)}</span>
                     <span className='text-[10px] text-gray-500 font-bold uppercase'>Pontos</span>
                  </div>
               </div>

               <p className='text-gray-400 text-sm font-medium leading-relaxed relative z-10 px-4'>
                 {data?.meta_economia > 30 ? 'Seu comportamento este mês está excelente! Continue assim.' : 'Você pode melhorar sua taxa de economia este mês.'}
               </p>
               
               <div className='absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity'>
                  <span className='text-6xl'>✨</span>
               </div>
            </div>
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
                      <XAxis dataKey='name' stroke='#4b5563' fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d1a2d', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                      <Area type='monotone' dataKey='receitas' stroke='#22c55e' strokeWidth={4} fillOpacity={1} fill='url(#colorRec)' />
                      <Area type='monotone' dataKey='despesas' stroke='#ef4444' strokeWidth={4} fillOpacity={1} fill='url(#colorDes)' />
                    </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className='bg-[#0d1a2d] rounded-[3rem] p-8 border border-gray-800 shadow-2xl flex flex-col relative group'>
                <h3 className='text-2xl font-black text-white mb-8'>Maiores Gastos</h3>
                <div className='h-80 w-full relative'>
                   <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey='value'
                        stroke='none'
                        cx='50%'
                        cy='50%'
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111f34', border: 'none', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
                    <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>Gastos</span>
                    <span className='text-xl font-black text-white'>{fmt(data.despesas)}</span>
                  </div>
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
