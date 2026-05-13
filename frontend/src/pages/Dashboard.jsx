import { useCallback, useEffect, useRef, useState } from 'react'
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
    patrimonio_liquido: 0, ativos: 0, passivos: 0, conquistas: []
  })
  const [insights, setInsights] = useState([])
  const [activeTab, setActiveTab] = useState('resumo')
  const [showFilters, setShowFilters] = useState(false)
  const filterRef = useRef(null)

  // Fechar filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false)
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilters])

  const carregarDashboard = useCallback(async (opt = {}) => {
    if (opt.showLoading) setLoading(true)
    setRefreshing(true)
    try {
      const [res, pat] = await Promise.all([
        api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`),
        api.get('/patrimonio'),
      ])

      const newData = res.data
      const newPat = pat.data

      if (newData) setData(newData)
      if (newPat) setPatrimonioData(newPat)

      if (newData) localStorage.setItem('dash_cache_data', JSON.stringify(newData))
      if (newPat) localStorage.setItem('dash_cache_pat', JSON.stringify(newPat))

      // Insights separado para não bloquear o dashboard
      try {
        const ins = await api.get('/insights')
        if (ins.data) {
          setInsights(ins.data)
          localStorage.setItem('dash_cache_ins', JSON.stringify(ins.data))
        }
      } catch (e) {
        console.warn('Insights indisponível:', e)
      }

      setLastUpdate(new Date())
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [mesSelecionado, anoSelecionado, mesFim, anoFim])

  useEffect(() => {
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
    { titulo: 'Receitas', valor: fmt(data?.receitas), cor: '#22c55e', bg: 'rgba(34,197,94,0.1)', icone: '💰' },
    { titulo: 'Despesas', valor: fmt(data?.despesas), cor: '#ef4444', bg: 'rgba(239,68,68,0.1)', icone: '💸' },
    { titulo: 'Saldo', valor: fmt(data?.saldo), cor: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icone: '📊' },
    { titulo: 'Economia', valor: `${Math.round(data?.meta_economia || 0)}%`, cor: '#a855f7', bg: 'rgba(168,85,247,0.1)', icone: '🎯' },
  ]

  if (loading && !data.receitas) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin'></div>
        <p style={{ color: 'var(--text-muted)' }} className='font-black uppercase tracking-widest text-[10px] animate-pulse'>Iniciando Cockpit...</p>
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12'>
        <div>
          <h1 className='text-4xl md:text-6xl font-black tracking-tighter uppercase' style={{ color: 'var(--text-main)' }}>Cockpit</h1>
          <div className='flex items-center gap-3 mt-2'>
            <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
            <p style={{ color: 'var(--text-muted)' }} className='font-bold text-[10px] uppercase tracking-widest'>
              {refreshing ? 'Sincronizando...' : lastUpdate ? `Atualizado ${lastUpdate.toLocaleTimeString()}` : 'Pronto'}
            </p>
          </div>
        </div>

        <div className='relative' ref={filterRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${
              showFilters ? 'bg-green-500 text-black border-green-500 shadow-xl' : 'border-[var(--border-color)]'
            }`}
            style={!showFilters ? { background: 'var(--bg-card)', color: 'var(--text-muted)' } : {}}
          >
            {showFilters ? '✕ Fechar' : '🔍 Filtrar Período'}
          </button>

          {showFilters && (
            <div className='absolute top-20 right-0 z-50 min-w-[320px] border p-6 rounded-[2rem] shadow-2xl' style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
              <div className='grid grid-cols-2 gap-4 mb-6'>
                <div className='space-y-2'>
                  <span style={{ color: 'var(--text-muted)' }} className='text-[10px] font-black uppercase tracking-widest'>Início</span>
                  <div className='p-3 rounded-2xl border' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                    <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className='bg-transparent text-xs outline-none w-full font-bold' style={{ color: 'var(--text-main)' }}>
                      {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} className='bg-transparent text-xs outline-none w-full font-bold mt-2' style={{ color: 'var(--text-main)' }}>
                      {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className='space-y-2'>
                  <span style={{ color: 'var(--text-muted)' }} className='text-[10px] font-black uppercase tracking-widest'>Fim</span>
                  <div className='p-3 rounded-2xl border' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                    <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className='bg-transparent text-xs outline-none w-full font-bold' style={{ color: 'var(--text-main)' }}>
                      {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className='bg-transparent text-xs outline-none w-full font-bold mt-2' style={{ color: 'var(--text-main)' }}>
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
      <div className='flex gap-1.5 p-2 rounded-[2.5rem] border mb-12 max-w-lg' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {[
          { id: 'resumo', label: 'Resumo', icon: '📊' },
          { id: 'ia', label: 'Análise', icon: '🤖' },
          { id: 'conquistas', label: 'Troféus', icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id ? 'bg-green-500 text-black shadow-lg' : 'hover:bg-green-500/10'
            }`}
            style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : {}}
          >
            <span className='text-xl'>{tab.icon}</span>
            <span className='hidden sm:inline'>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Principal */}
      {activeTab === 'resumo' && (
        <div className='space-y-10'>
          {/* Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {cards.map((card, i) => (
              <div key={i} className='rounded-[3rem] p-8 border hover:border-green-500/30 transition-all shadow-lg flex flex-col items-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className='w-16 h-16 rounded-[1.8rem] mb-6 flex items-center justify-center text-3xl' style={{ background: card.bg, color: card.cor }}>
                  {card.icone}
                </div>
                <p style={{ color: 'var(--text-muted)' }} className='text-[10px] font-black uppercase tracking-[0.2em] mb-2'>{card.titulo}</p>
                <h3 className='text-2xl md:text-3xl font-black' style={{ color: 'var(--text-main)' }}>{card.valor}</h3>
              </div>
            ))}
          </div>

          {/* Patrimônio */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            <div className='lg:col-span-2 border p-10 rounded-[3rem] shadow-lg relative overflow-hidden' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='relative z-10'>
                <span className='text-[10px] font-black tracking-[0.3em] uppercase mb-4 block' style={{ color: 'var(--accent)' }}>Patrimônio Líquido</span>
                <div className='flex items-baseline gap-4 mb-10'>
                  <span className='text-3xl font-light' style={{ color: 'var(--text-muted)' }}>R$</span>
                  <h2 className='text-5xl md:text-8xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>
                    {fmt(patrimonioData?.patrimonio_liquido).replace('R$', '').trim()}
                  </h2>
                </div>
                <div className='grid grid-cols-2 gap-10 border-t pt-10 max-w-md' style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }} className='text-[10px] font-black uppercase tracking-widest block mb-2'>Ativos</span>
                    <p className='text-2xl font-black' style={{ color: 'var(--text-main)' }}>{fmt(patrimonioData?.ativos)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }} className='text-[10px] font-black uppercase tracking-widest block mb-2'>Dívidas</span>
                    <p className='text-2xl text-red-400 font-black'>{fmt(patrimonioData?.passivos)}</p>
                  </div>
                </div>
              </div>
              <div className='absolute -right-10 -bottom-10 opacity-5 text-[15rem]'>🏦</div>
            </div>

            <div className='border p-10 rounded-[3rem] shadow-lg flex flex-col items-center justify-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
               <span className='text-[10px] font-black tracking-[0.3em] uppercase mb-8 block' style={{ color: '#a855f7' }}>Economia Mensal</span>
               <div className='relative w-48 h-48 flex items-center justify-center'>
                 <svg className='w-full h-full transform -rotate-90'>
                   <circle cx='96' cy='96' r='88' stroke='var(--border-color)' strokeWidth='12' fill='transparent' />
                   <circle cx='96' cy='96' r='88' stroke='#22c55e' strokeWidth='12' fill='transparent' strokeDasharray={552.92} strokeDashoffset={552.92 - (552.92 * (data?.meta_economia || 10)) / 100} />
                 </svg>
                 <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-5xl font-black' style={{ color: 'var(--text-main)' }}>{Math.round(data?.meta_economia || 0)}%</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
             <div className='xl:col-span-2 rounded-[3rem] p-8 border shadow-lg' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h3 className='text-2xl font-black mb-8' style={{ color: 'var(--text-main)' }}>Fluxo de Caixa</h3>
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
                      <XAxis dataKey='name' stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '20px', color: 'var(--text-main)' }} />
                      <Area type='monotone' dataKey='receitas' stroke='#22c55e' strokeWidth={4} fill='url(#colorRec)' />
                      <Area type='monotone' dataKey='despesas' stroke='#ef4444' strokeWidth={4} fill='url(#colorDes)' />
                    </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className='rounded-[3rem] p-8 border shadow-lg flex flex-col items-center justify-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h3 className='text-2xl font-black mb-8' style={{ color: 'var(--text-main)' }}>Categorias</h3>
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
        <div className='space-y-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>Análise Financeira</h2>
              <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Baseada nos seus dados do período</p>
            </div>
          </div>

          {/* Barra de saúde financeira */}
          <div className='border rounded-[2.5rem] p-8' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='flex items-center justify-between mb-4'>
              <span className='font-black text-xs uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>Saúde Financeira</span>
              <span className='font-black text-lg' style={{ color: data?.meta_economia >= 20 ? '#22c55e' : data?.meta_economia > 0 ? '#f59e0b' : '#ef4444' }}>
                {data?.meta_economia >= 30 ? 'Excelente 🏆' : data?.meta_economia >= 20 ? 'Ótimo 😊' : data?.meta_economia > 0 ? 'Atenção ⚠️' : 'Crítico 🚨'}
              </span>
            </div>
            <div className='w-full h-4 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
              <div className='h-full rounded-full transition-all duration-700'
                style={{ width: `${Math.min(100, Math.max(0, data?.meta_economia || 0))}%`, background: data?.meta_economia >= 20 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : data?.meta_economia > 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#ef4444' }} />
            </div>
            <div className='flex justify-between mt-2 text-xs font-bold' style={{ color: 'var(--text-muted)' }}>
              <span>Crítico</span><span>Estável</span><span>Excelente</span>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {[
              { label: 'Taxa de economia', valor: `${Math.round(data?.meta_economia || 0)}%`, icon: '💰', ok: (data?.meta_economia || 0) >= 20 },
              { label: 'Saldo do período', valor: fmt(data?.saldo), icon: '📊', ok: (data?.saldo || 0) >= 0 },
              { label: 'Total receitas', valor: fmt(data?.receitas), icon: '📈', ok: true },
              { label: 'Total despesas', valor: fmt(data?.despesas), icon: '📉', ok: (data?.despesas || 0) <= (data?.receitas || 0) },
            ].map((s, i) => (
              <div key={i} className='border rounded-[2rem] p-6 flex flex-col gap-2' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <span className='text-2xl'>{s.icon}</span>
                <p className='text-[10px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className='text-xl font-black' style={{ color: s.ok ? 'var(--text-main)' : '#ef4444' }}>{s.valor}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            {insights.map((ins, i) => {
              const isWarn = ins.msg.toLowerCase().includes('maior') || ins.msg.toLowerCase().includes('revis')
              const isGood = ins.msg.toLowerCase().includes('parabén') || ins.msg.toLowerCase().includes('economiz')
              const icon = isWarn ? '⚠️' : isGood ? '🎉' : '💡'
              const accent = isWarn ? '#f59e0b' : isGood ? '#22c55e' : '#3b82f6'
              return (
                <div key={i} className='rounded-[2rem] p-6 border-l-4 border flex gap-4 items-start'
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderLeftColor: accent }}>
                  <span className='text-3xl shrink-0'>{icon}</span>
                  <div>
                    <p className='font-black text-sm mb-1' style={{ color: accent }}>
                      {isWarn ? 'Atenção' : isGood ? 'Parabéns!' : 'Dica'}
                    </p>
                    <p className='text-sm leading-relaxed' style={{ color: 'var(--text-main)' }}>{ins.msg}</p>
                  </div>
                </div>
              )
            })}
            {insights.length === 0 && (
              <div className='col-span-2 text-center py-12' style={{ color: 'var(--text-muted)' }}>
                <span className='text-5xl block mb-4'>🔍</span>
                <p>Registre mais lançamentos para receber análises personalizadas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'conquistas' && (
        <div className='space-y-8'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>Troféus</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>
              {conquistas.length} troféu{conquistas.length !== 1 ? 's' : ''} desbloqueado{conquistas.length !== 1 ? 's' : ''}
            </p>
          </div>

          {conquistas.length === 0 ? (
            <div className='border rounded-[3rem] p-16 flex flex-col items-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className='text-7xl mb-6'>🔒</span>
              <h3 className='text-2xl font-black mb-3' style={{ color: 'var(--text-main)' }}>Nenhum troféu ainda</h3>
              <p style={{ color: 'var(--text-muted)' }} className='max-w-sm'>Registre receitas, despesas e metas para desbloquear conquistas!</p>
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
              {conquistas.map((c, i) => (
                <div key={i} className='border rounded-[2.5rem] p-6 flex flex-col items-center text-center hover:scale-105 transition-transform shadow-lg'
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: '0 0 20px rgba(34,197,94,0.08)' }}>
                  <div className='w-16 h-16 rounded-[1.5rem] mb-4 flex items-center justify-center text-3xl' style={{ background: 'rgba(34,197,94,0.12)' }}>
                    {c.icone}
                  </div>
                  <h4 className='font-black text-sm mb-2' style={{ color: 'var(--text-main)' }}>{c.titulo}</h4>
                  <p className='text-[10px] leading-relaxed' style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
                  <div className='mt-3 flex items-center gap-1'>
                    <div className='w-2 h-2 rounded-full bg-green-500'></div>
                    <span className='text-[9px] font-black text-green-500 uppercase tracking-widest'>Desbloqueado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
