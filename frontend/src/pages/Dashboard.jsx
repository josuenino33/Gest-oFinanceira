import { useCallback, useEffect, useState } from 'react'
import api from '../utils/api'
import {
  XAxis, Tooltip, ResponsiveContainer,
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
    historico: mesesLabel.map(m => ({ name: m, receitas: 0, despesas: 0 }))
  })
  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())
  const [mesFim, setMesFim] = useState(now.getMonth())
  const [anoFim, setAnoFim] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [patrimonioData, setPatrimonioData] = useState({
    patrimonio_liquido: 0,
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
      const [res, pat, ins] = await Promise.all([
        api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`),
        api.get('/patrimonio'),
        api.get('/insights')
      ])
      
      const newData = res.data
      const newPat = pat.data
      const newIns = ins.data

      if (newData) setData(newData)
      if (newPat) setPatrimonioData(newPat)
      if (newIns) setInsights(newIns)
      
      // Salvar no cache local
      if (newData) localStorage.setItem('dash_cache_data', JSON.stringify(newData))
      if (newPat) localStorage.setItem('dash_cache_pat', JSON.stringify(newPat))
      if (newIns) localStorage.setItem('dash_cache_ins', JSON.stringify(newIns))
      
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [mesSelecionado, anoSelecionado, mesFim, anoFim])

  useEffect(() => {
    // Carregamento Inicial + Cache
    const cData = localStorage.getItem('dash_cache_data')
    const cPat = localStorage.getItem('dash_cache_pat')
    const cIns = localStorage.getItem('dash_cache_ins')

    if (cData) try { setData(JSON.parse(cData)) } catch(e) {}
    if (cPat) try { setPatrimonioData(JSON.parse(cPat)) } catch(e) {}
    if (cIns) try { setInsights(JSON.parse(cIns)) } catch(e) {}

    carregarDashboard({ showLoading: !cData })
  }, [carregarDashboard])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') carregarDashboard()
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [carregarDashboard])

  const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const chartData = data?.historico || []
  const pieData = (data?.categorias || []).map(c => ({ name: c.nome, value: Number(c.total) }))
  const conquistas = patrimonioData?.conquistas || []

  const cards = [
    { titulo: 'Receitas', valor: fmt(data?.receitas), cor: 'bg-green-500/10 text-green-500', icone: '💰' },
    { titulo: 'Despesas', valor: fmt(data?.despesas), cor: 'bg-red-500/10 text-red-500', icone: '💸' },
    { titulo: 'Saldo', valor: fmt(data?.saldo), cor: 'bg-blue-500/10 text-blue-500', icone: '📊' },
    { titulo: 'Economia', valor: `${Math.round(data?.meta_economia || 0)}%`, cor: 'bg-purple-500/10 text-purple-500', icone: '🎯' },
  ]

  if (loading && !data.receitas) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin'></div>
        <p className='text-gray-500 font-black uppercase tracking-widest text-[10px] animate-pulse'>Iniciando Cockpit...</p>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12'>
        <div>
          <h1 className='text-4xl md:text-6xl font-black text-white tracking-tighter uppercase'>Cockpit</h1>
          <div className='flex items-center gap-3 mt-2'>
            <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
            <p className='text-gray-500 font-bold text-[10px] uppercase tracking-widest'>
              {refreshing ? 'Sincronizando...' : lastUpdate ? `Atualizado ${lastUpdate.toLocaleTimeString()}` : 'Pronto'}
            </p>
          </div>
        </div>

        <div className='relative'>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${
              showFilters ? 'bg-green-500 text-black border-green-500 shadow-xl' : 'bg-[#1e293b] border-gray-800 text-gray-400'
            }`}
          >
            {showFilters ? '✕ Fechar' : '🔍 Filtrar Período'}
          </button>

          {showFilters && (
            <div className='absolute top-20 right-0 z-50 min-w-[320px] bg-[#0d1a2d] border border-gray-800 p-6 rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-top-4'>
              <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='space-y-2'>
                  <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>Início</span>
                  <div className='bg-[#111f34] p-3 rounded-2xl border border-gray-700/30'>
                    <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                      {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold mt-2'>
                      {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className='space-y-2'>
                  <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>Fim</span>
                  <div className='bg-[#111f34] p-3 rounded-2xl border border-gray-700/30'>
                    <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold'>
                      {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className='bg-transparent text-white text-xs outline-none w-full font-bold mt-2'>
                      {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { carregarDashboard(); setShowFilters(false); }}
                className='w-full bg-green-500 text-black font-black py-4 rounded-xl shadow-lg shadow-green-500/20'
              >
                APLICAR FILTRO
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação */}
      <div className='flex gap-1.5 bg-[#1e293b] p-2 rounded-[2.5rem] border border-gray-800 mb-12 max-w-lg'>
        {[
          { id: 'resumo', label: 'Resumo', icon: '📊' },
          { id: 'ia', label: 'Análise', icon: '🤖' },
          { id: 'conquistas', label: 'Troféus', icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id ? 'bg-green-500 text-black shadow-lg' : 'text-gray-500 hover:bg-white/5'
            }`}
          >
            <span className='text-xl'>{tab.icon}</span> 
            <span className='hidden sm:inline'>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Principal */}
      {activeTab === 'resumo' && (
        <div className='space-y-10 animate-in fade-in duration-500'>
          {/* Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {cards.map((card, i) => (
              <div key={i} className='bg-[#1e293b] rounded-[3rem] p-8 border border-gray-800 hover:border-green-500/30 transition-all shadow-2xl flex flex-col items-center text-center'>
                <div className={`w-16 h-16 rounded-[1.8rem] ${card.cor.split(' ')[0]} mb-6 flex items-center justify-center text-3xl ${card.cor.split(' ')[1]}`}>
                  {card.icone}
                </div>
                <p className='text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2'>{card.titulo}</p>
                <h3 className='text-2xl md:text-3xl font-black text-white'>{card.valor}</h3>
              </div>
            ))}
          </div>

          {/* Patrimônio */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            <div className='lg:col-span-2 bg-gradient-to-br from-[#1e293b] to-[#080f1e] border border-gray-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden'>
              <div className='relative z-10'>
                <span className='text-[10px] text-green-400 font-black tracking-[0.3em] uppercase mb-4 block'>Patrimônio Líquido</span>
                <div className='flex items-baseline gap-4 mb-10'>
                  <span className='text-3xl text-gray-500 font-light'>R$</span>
                  <h2 className='text-5xl md:text-8xl font-black text-white tracking-tighter'>
                    {fmt(patrimonioData?.patrimonio_liquido).replace('R$', '').trim()}
                  </h2>
                </div>
                <div className='grid grid-cols-2 gap-10 border-t border-gray-800/50 pt-10 max-w-md'>
                  <div>
                    <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2'>Ativos</span>
                    <p className='text-2xl text-white font-black'>{fmt(patrimonioData?.ativos)}</p>
                  </div>
                  <div>
                    <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2'>Dívidas</span>
                    <p className='text-2xl text-red-400 font-black'>{fmt(patrimonioData?.passivos)}</p>
                  </div>
                </div>
              </div>
              <div className='absolute -right-10 -bottom-10 opacity-5 text-[15rem]'>🏦</div>
            </div>

            <div className='bg-[#0d1a2d] border border-gray-800 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center'>
               <span className='text-[10px] text-purple-400 font-black tracking-[0.3em] uppercase mb-8 block'>Economia Mensal</span>
               <div className='relative w-48 h-48 flex items-center justify-center'>
                  <svg className='w-full h-full transform -rotate-90'>
                    <circle cx='96' cy='96' r='88' stroke='currentColor' strokeWidth='12' fill='transparent' className='text-gray-800' />
                    <circle cx='96' cy='96' r='88' stroke='currentColor' strokeWidth='12' fill='transparent' strokeDasharray={552.92} strokeDashoffset={552.92 - (552.92 * (data?.meta_economia || 10)) / 100} className='text-green-500' />
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                     <span className='text-5xl font-black text-white'>{Math.round(data?.meta_economia || 0)}%</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
             <div className='xl:col-span-2 bg-[#0d1a2d] rounded-[3rem] p-8 border border-gray-800 shadow-2xl'>
                <h3 className='text-2xl font-black text-white mb-8'>Fluxo de Caixa</h3>
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
                      <Tooltip contentStyle={{ backgroundColor: '#0d1a2d', border: 'none', borderRadius: '20px' }} />
                      <Area type='monotone' dataKey='receitas' stroke='#22c55e' strokeWidth={4} fill='url(#colorRec)' />
                      <Area type='monotone' dataKey='despesas' stroke='#ef4444' strokeWidth={4} fill='url(#colorDes)' />
                    </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className='bg-[#0d1a2d] rounded-[3rem] p-8 border border-gray-800 shadow-2xl flex flex-col items-center justify-center'>
                <h3 className='text-2xl font-black text-white mb-8'>Categorias</h3>
                <div className='h-64 w-full relative'>
                   <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey='value'>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
        <div className='bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-[3rem] p-10 animate-in fade-in'>
           <h2 className='text-3xl font-black text-white mb-10'>Insights de IA</h2>
           <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {insights.map((ins, i) => (
                <div key={i} className='bg-[#0b1728] p-8 rounded-[2rem] border border-white/5'>
                  <span className='text-4xl block mb-4'>💡</span>
                  <p className='text-lg text-gray-200'>{ins.msg}</p>
                </div>
              ))}
              {insights.length === 0 && <p className='text-gray-500 italic'>Sua IA está processando os dados...</p>}
           </div>
        </div>
      )}

      {activeTab === 'conquistas' && (
        <div className='bg-[#0d1a2d] border border-gray-800 rounded-[3rem] p-10 animate-in fade-in'>
           <h2 className='text-3xl font-black text-white mb-10'>Troféus</h2>
           <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
              {conquistas.map((c, i) => (
                <div key={i} className='p-8 rounded-[2.5rem] border border-gray-800 bg-gray-900/50 flex flex-col items-center text-center opacity-30'>
                   <span className='text-5xl mb-4'>🏆</span>
                   <h4 className='font-black text-white text-xs uppercase'>{c.titulo || 'Conquista'}</h4>
                </div>
              ))}
              {conquistas.length === 0 && <p className='text-gray-500 italic'>Continue poupando para ganhar troféus!</p>}
           </div>
        </div>
      )}
    </div>
  )
}
