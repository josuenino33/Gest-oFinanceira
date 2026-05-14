import { useCallback, useEffect, useState } from 'react'
import api from '../utils/api'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, ReferenceLine
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
  const [activePreset, setActivePreset] = useState('mes')
  const [showCustom, setShowCustom] = useState(false)
  const [projecao, setProjecao] = useState(null)
  const [saude, setSaude] = useState(null)
  const [alertasIA, setAlertasIA] = useState(null)
  const [loadingProjecao, setLoadingProjecao] = useState(false)
  const [loadingSaude, setLoadingSaude] = useState(false)
  const [loadingAlertas, setLoadingAlertas] = useState(false)

  const aplicarPreset = (preset) => {
    const n = new Date()
    const m = n.getMonth(), a = n.getFullYear()
    setActivePreset(preset)
    setShowCustom(preset === 'custom')
    if (preset === 'mes') {
      setMesSelecionado(m); setAnoSelecionado(a); setMesFim(m); setAnoFim(a)
    } else if (preset === '3m') {
      const s = new Date(a, m - 2, 1)
      setMesSelecionado(s.getMonth()); setAnoSelecionado(s.getFullYear()); setMesFim(m); setAnoFim(a)
    } else if (preset === '6m') {
      const s = new Date(a, m - 5, 1)
      setMesSelecionado(s.getMonth()); setAnoSelecionado(s.getFullYear()); setMesFim(m); setAnoFim(a)
    } else if (preset === 'ano') {
      setMesSelecionado(0); setAnoSelecionado(a); setMesFim(11); setAnoFim(a)
    }
  }

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

  if (loading && !data.receitas) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin'></div>
        <p style={{ color: 'var(--text-muted)' }} className='font-black uppercase tracking-widest text-[10px] animate-pulse'>Iniciando Cockpit...</p>
      </div>
    )
  }

  const presets = [
    { id: 'mes', label: 'Este Mês' },
    { id: '3m', label: 'Últimos 3M' },
    { id: '6m', label: 'Últimos 6M' },
    { id: 'ano', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ]

  const periodoLabel = activePreset === 'mes'
    ? mesesNomes[mesFim]
    : activePreset === 'ano'
    ? `${anoSelecionado}`
    : `${mesesNomes[mesSelecionado].slice(0,3)} – ${mesesNomes[mesFim].slice(0,3)} ${anoFim}`

  return (
    <div className='max-w-7xl mx-auto pb-20 px-4 md:px-0'>
      {/* Header */}
      <div className='flex flex-col gap-6 mb-10'>
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
          <div>
            <h1 className='text-4xl md:text-6xl font-black tracking-tighter uppercase' style={{ color: 'var(--text-main)' }}>Cockpit</h1>
            <div className='flex items-center gap-3 mt-2'>
              <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
              <p style={{ color: 'var(--text-muted)' }} className='font-bold text-[10px] uppercase tracking-widest'>
                {refreshing ? 'Sincronizando...' : lastUpdate ? `Atualizado ${lastUpdate.toLocaleTimeString()}` : 'Pronto'}
              </p>
            </div>
          </div>
          <p className='text-sm font-semibold hidden md:block' style={{ color: 'var(--text-muted)' }}>
            Período: <span style={{ color: 'var(--text-main)' }}>{periodoLabel}</span>
          </p>
        </div>

        {/* Filtro em pills */}
        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap gap-2'>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => aplicarPreset(p.id)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                  activePreset === p.id
                    ? 'bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-[var(--border-color)] hover:border-green-500/40'
                }`}
                style={activePreset !== p.id ? { background: 'var(--bg-card)', color: 'var(--text-muted)' } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>

          {showCustom && (
            <div className='border rounded-[1.5rem] p-5 flex flex-wrap gap-4 items-end' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex gap-2 items-center'>
                <span className='text-[10px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>De</span>
                <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className='border rounded-xl px-3 py-2 text-xs font-bold outline-none' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))} className='border rounded-xl px-3 py-2 text-xs font-bold outline-none' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className='flex gap-2 items-center'>
                <span className='text-[10px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>Até</span>
                <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className='border rounded-xl px-3 py-2 text-xs font-bold outline-none' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className='border rounded-xl px-3 py-2 text-xs font-bold outline-none' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button onClick={() => carregarDashboard()} className='bg-green-500 text-black font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-green-500/20'>
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação */}
      <div className='flex gap-1 p-1.5 rounded-[2.5rem] border mb-12 overflow-x-auto hide-scrollbar' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {[
          { id: 'resumo',    label: 'Resumo',   icon: '📊' },
          { id: 'projecao',  label: 'Projeção',  icon: '🔮' },
          { id: 'saude',     label: 'Saúde',     icon: '❤️' },
          { id: 'ia',        label: 'Alertas',   icon: '🤖' },
          { id: 'conquistas',label: 'Troféus',   icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id === 'projecao' && !projecao && !loadingProjecao) {
                setLoadingProjecao(true)
                api.get('/projecao?meses=6').then(r => setProjecao(r.data)).catch(() => setProjecao({})).finally(() => setLoadingProjecao(false))
              }
              if (tab.id === 'saude' && !saude && !loadingSaude) {
                setLoadingSaude(true)
                api.get(`/saude-financeira?mes=${now.getMonth()+1}&ano=${now.getFullYear()}`).then(r => setSaude(r.data)).catch(() => setSaude({})).finally(() => setLoadingSaude(false))
              }
              if (tab.id === 'ia' && !alertasIA && !loadingAlertas) {
                setLoadingAlertas(true)
                api.get('/alertas-ia').then(r => setAlertasIA(r.data)).catch(() => setAlertasIA([])).finally(() => setLoadingAlertas(false))
              }
            }}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id ? 'bg-green-500 text-black shadow-lg' : 'hover:bg-green-500/10'
            }`}
            style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : {}}
          >
            <span className='text-base'>{tab.icon}</span>
            <span className='hidden sm:inline'>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Principal */}
      {activeTab === 'resumo' && (
        <div className='space-y-6'>

          {/* HERO — Patrimônio Líquido */}
          <div className='border rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-lg' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8'>
              <div>
                <span className='text-[10px] font-black tracking-[0.3em] uppercase block mb-1' style={{ color: 'var(--accent)' }}>Patrimônio Líquido</span>
                <p className='text-xs mb-3' style={{ color: 'var(--text-muted)' }}>Em Caixa + Investido − A Pagar</p>
                <div className='flex items-baseline gap-2'>
                  <span className='text-2xl font-light' style={{ color: 'var(--text-muted)' }}>R$</span>
                  <h2 className='text-5xl md:text-6xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>
                    {fmt(patrimonioData?.patrimonio_liquido).replace('R$', '').trim()}
                  </h2>
                </div>
              </div>
              <div className='flex flex-wrap gap-6 md:gap-8'>
                {/* Em Caixa: receitas - contas pagas */}
                <div>
                  <span className='text-[10px] font-black uppercase tracking-widest block mb-1' style={{ color: 'var(--text-muted)' }}>💵 Em Caixa</span>
                  <p className='text-xl font-black' style={{ color: (patrimonioData?.saldo_caixa || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmt(patrimonioData?.saldo_caixa || 0)}
                  </p>
                  <p className='text-[10px] mt-0.5' style={{ color: 'var(--text-muted)' }}>disponível agora</p>
                </div>
                <div className='hidden md:block w-px self-stretch' style={{ background: 'var(--border-color)' }} />
                {/* A Pagar: contas pendentes */}
                {(patrimonioData?.a_pagar || 0) > 0 && (
                  <>
                    <div>
                      <span className='text-[10px] font-black uppercase tracking-widest block mb-1' style={{ color: 'var(--text-muted)' }}>⚠️ A Pagar</span>
                      <p className='text-xl font-black' style={{ color: '#f59e0b' }}>
                        {fmt(patrimonioData?.a_pagar || 0)}
                      </p>
                      <p className='text-[10px] mt-0.5' style={{ color: 'var(--text-muted)' }}>contas pendentes</p>
                    </div>
                    <div className='hidden md:block w-px self-stretch' style={{ background: 'var(--border-color)' }} />
                  </>
                )}
                {/* Investido: patrimônio separado */}
                <div>
                  <span className='text-[10px] font-black uppercase tracking-widest block mb-1' style={{ color: 'var(--text-muted)' }}>📈 Investido</span>
                  <p className='text-xl font-black' style={{ color: '#3b82f6' }}>
                    {fmt(patrimonioData?.investimentos || 0)}
                  </p>
                  <p className='text-[10px] mt-0.5' style={{ color: 'var(--text-muted)' }}>patrimônio separado</p>
                </div>
                <div className='hidden md:block w-px self-stretch' style={{ background: 'var(--border-color)' }} />
                {/* Rendimento: valorização dos investimentos */}
                <div>
                  <span className='text-[10px] font-black uppercase tracking-widest block mb-1' style={{ color: 'var(--text-muted)' }}>🔥 Rendimento</span>
                  <p className='text-xl font-black' style={{ color: (patrimonioData?.rendimento || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(patrimonioData?.rendimento || 0) >= 0 ? '+' : ''}{fmt(patrimonioData?.rendimento || 0)}
                  </p>
                  <p className='text-[10px] mt-0.5' style={{ color: 'var(--text-muted)' }}>valorização</p>
                </div>
              </div>
            </div>
            <div className='absolute -right-8 -bottom-8 opacity-[0.04] text-[14rem] select-none'>💎</div>
          </div>

          {/* Este Período + Taxa de Poupança */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>

            {/* Fluxo do período */}
            <div className='md:col-span-2 border rounded-[2.5rem] p-8' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='mb-6'>
                <span className='text-[10px] font-black tracking-[0.3em] uppercase block' style={{ color: '#3b82f6' }}>Este Período</span>
                <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{periodoLabel}</p>
              </div>
              <div className='space-y-3'>
                <div className='flex items-center justify-between px-5 py-4 rounded-2xl' style={{ background: 'rgba(34,197,94,0.08)' }}>
                  <div className='flex items-center gap-3'>
                    <span className='w-7 h-7 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500 font-black text-sm'>↑</span>
                    <span className='font-bold text-sm' style={{ color: 'var(--text-muted)' }}>Receitas</span>
                  </div>
                  <span className='text-xl font-black text-green-500'>{fmt(data?.receitas)}</span>
                </div>
                <div className='flex items-center justify-between px-5 py-4 rounded-2xl' style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <div className='flex items-center gap-3'>
                    <span className='w-7 h-7 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-black text-sm'>↓</span>
                    <span className='font-bold text-sm' style={{ color: 'var(--text-muted)' }}>Despesas</span>
                  </div>
                  <span className='text-xl font-black text-red-400'>{fmt(data?.despesas)}</span>
                </div>
                <div className='border-t pt-4' style={{ borderColor: 'var(--border-color)' }}>
                  <div className='flex items-center justify-between px-5 py-3'>
                    <div className='flex items-center gap-3'>
                      <span className='w-7 h-7 rounded-xl flex items-center justify-center font-black text-sm'
                        style={{ background: (data?.saldo || 0) >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: (data?.saldo || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                        =
                      </span>
                      <span className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Saldo do Período</span>
                    </div>
                    <span className='text-2xl font-black' style={{ color: (data?.saldo || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {fmt(data?.saldo)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Taxa de Poupança */}
            <div className='border rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className='text-[10px] font-black tracking-[0.3em] uppercase mb-2 block' style={{ color: '#a855f7' }}>Taxa de Poupança</span>
              <p className='text-xs mb-5' style={{ color: 'var(--text-muted)' }}>{periodoLabel}</p>
              <div className='relative w-36 h-36 flex items-center justify-center'>
                <svg className='w-full h-full transform -rotate-90'>
                  <circle cx='72' cy='72' r='62' stroke='var(--border-color)' strokeWidth='10' fill='transparent' />
                  <circle cx='72' cy='72' r='62' stroke='#22c55e' strokeWidth='10' fill='transparent'
                    strokeDasharray={389.56}
                    strokeDashoffset={389.56 - (389.56 * Math.min(100, Math.max(0, data?.meta_economia || 0))) / 100} />
                </svg>
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <span className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>{Math.round(data?.meta_economia || 0)}%</span>
                  <span className='text-[9px] font-bold mt-0.5' style={{ color: 'var(--text-muted)' }}>economizado</span>
                </div>
              </div>
              <p className='text-xs mt-5 font-semibold' style={{ color: (data?.meta_economia || 0) >= 20 ? '#22c55e' : '#f59e0b' }}>
                {(data?.meta_economia || 0) >= 30 ? 'Excelente ritmo! 🚀' : (data?.meta_economia || 0) >= 20 ? 'Ótima poupança! 👍' : (data?.meta_economia || 0) > 0 ? 'Pode melhorar ⚡' : 'Sem receitas no período'}
              </p>
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

      {/* ── TAB: PROJEÇÃO ─────────────────────────────────────────────── */}
      {activeTab === 'projecao' && (
        <div className='space-y-8'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>🔮 Projeção de Fluxo de Caixa</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Baseada na média dos últimos 3 meses + recorrências ativas</p>
          </div>

          {loadingProjecao && (
            <div className='flex items-center justify-center py-20'>
              <div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' />
            </div>
          )}

          {!loadingProjecao && projecao && (
            <>
              {/* Cards de médias */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {[
                  { label: 'Receita Mensal Estimada', val: projecao.media_receita, color: '#22c55e' },
                  { label: 'Despesa Mensal Estimada', val: projecao.media_despesa, color: '#ef4444' },
                  { label: 'Saldo Líquido Mensal',   val: (projecao.media_receita||0) - (projecao.media_despesa||0), color: ((projecao.media_receita||0) - (projecao.media_despesa||0)) >= 0 ? '#22c55e' : '#ef4444' },
                ].map(c => (
                  <div key={c.label} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <p className='text-xs font-bold uppercase tracking-widest mb-2' style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                    <p className='text-2xl font-black' style={{ color: c.color }}>{fmt(c.val)}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico */}
              <div className='rounded-[2.5rem] p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className='text-xs font-black uppercase tracking-widest mb-6' style={{ color: 'var(--text-muted)' }}>Saldo Projetado — Próximos 6 Meses</p>
                <ResponsiveContainer width='100%' height={280}>
                  <AreaChart data={projecao.projecoes || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id='projGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%'  stopColor='#22c55e' stopOpacity={0.3} />
                        <stop offset='95%' stopColor='#22c55e' stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey='mes' tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={55} />
                    <ReferenceLine y={0} stroke='#ef4444' strokeDasharray='4 4' strokeOpacity={0.5} />
                    <Tooltip formatter={(v) => [fmt(v), 'Saldo']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, color: 'var(--text-main)' }} />
                    <Area type='monotone' dataKey='saldo' stroke='#22c55e' strokeWidth={2.5} fill='url(#projGrad)' dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
                {(projecao.projecoes || []).some(p => p.saldo < 0) && (
                  <p className='text-xs text-red-400 mt-4 font-semibold'>⚠️ Atenção: projeção indica saldo negativo em alguns meses. Considere reduzir despesas ou aumentar receitas.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: SAÚDE FINANCEIRA ─────────────────────────────────────── */}
      {activeTab === 'saude' && (
        <div className='space-y-8'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>❤️ Saúde Financeira</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Score e análise da sua situação financeira atual</p>
          </div>

          {loadingSaude && (
            <div className='flex items-center justify-center py-20'>
              <div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' />
            </div>
          )}

          {!loadingSaude && saude && (
            <>
              {/* Score principal */}
              <div className='rounded-[2.5rem] p-8 border relative overflow-hidden' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className='flex flex-col md:flex-row md:items-center gap-8'>
                  <div className='flex flex-col items-center justify-center w-40 h-40 rounded-full border-8 shrink-0 mx-auto md:mx-0'
                    style={{ borderColor: (saude.score||0) >= 70 ? '#22c55e' : (saude.score||0) >= 40 ? '#f59e0b' : '#ef4444' }}>
                    <span className='text-5xl font-black' style={{ color: (saude.score||0) >= 70 ? '#22c55e' : (saude.score||0) >= 40 ? '#f59e0b' : '#ef4444' }}>{saude.score||0}</span>
                    <span className='text-xs font-bold' style={{ color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-2xl font-black mb-1' style={{ color: 'var(--text-main)' }}>
                      {(saude.score||0) >= 80 ? '🏆 Excelente' : (saude.score||0) >= 60 ? '😊 Bom' : (saude.score||0) >= 40 ? '⚠️ Regular' : '🚨 Atenção'}
                    </h3>
                    <p className='text-sm mb-4' style={{ color: 'var(--text-muted)' }}>
                      {(saude.score||0) >= 80 ? 'Sua vida financeira está muito bem organizada!' :
                       (saude.score||0) >= 60 ? 'Bom progresso — continue melhorando.' :
                       (saude.score||0) >= 40 ? 'Há espaço para melhorar. Veja os fatores abaixo.' :
                       'Alguns pontos precisam de atenção urgente.'}
                    </p>
                    <div className='h-3 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                      <div className='h-full rounded-full transition-all duration-700'
                        style={{ width: `${saude.score||0}%`, background: (saude.score||0) >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : (saude.score||0) >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : '#ef4444' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fatores */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {(saude.fatores||[]).map((f, i) => (
                  <div key={i} className='rounded-2xl p-5 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xl'>{f.icone}</span>
                        <span className='font-bold text-sm' style={{ color: 'var(--text-main)' }}>{f.fator}</span>
                      </div>
                      <span className='font-black text-sm' style={{ color: f.pts === f.max ? '#22c55e' : f.pts >= f.max * 0.6 ? '#f59e0b' : '#ef4444' }}>
                        {f.pts}/{f.max} pts
                      </span>
                    </div>
                    <div className='h-2 rounded-full overflow-hidden mb-2' style={{ background: 'var(--bg-input)' }}>
                      <div className='h-full rounded-full' style={{ width: `${(f.pts/f.max)*100}%`, background: f.pts === f.max ? '#22c55e' : f.pts >= f.max*0.6 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{f.msg}</p>
                  </div>
                ))}
              </div>

              {/* Regra 50-30-20 */}
              {saude.receita > 0 && (
                <div className='rounded-[2.5rem] p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <p className='text-xs font-black uppercase tracking-widest mb-6' style={{ color: 'var(--accent)' }}>Regra 50 · 30 · 20</p>
                  <div className='space-y-5'>
                    {[
                      { label: 'Necessidades', pct: 50, real: saude.regra_50_30_20?.necessidades?.real, meta: saude.regra_50_30_20?.necessidades?.meta, color: '#3b82f6' },
                      { label: 'Desejos',      pct: 30, real: saude.regra_50_30_20?.desejos?.real,      meta: saude.regra_50_30_20?.desejos?.meta,      color: '#a855f7' },
                      { label: 'Poupança',     pct: 20, real: saude.regra_50_30_20?.poupanca?.real,     meta: saude.regra_50_30_20?.poupanca?.meta,     color: '#22c55e' },
                    ].map(b => (
                      <div key={b.label}>
                        <div className='flex justify-between text-sm mb-2'>
                          <span className='font-bold' style={{ color: 'var(--text-main)' }}>{b.label} <span className='font-normal' style={{ color: 'var(--text-muted)' }}>({b.pct}%)</span></span>
                          <span style={{ color: 'var(--text-muted)' }}>{fmt(b.real)} <span className='text-xs'>/ meta {fmt(b.meta)}</span></span>
                        </div>
                        <div className='h-3 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                          <div className='h-full rounded-full transition-all duration-500' style={{ width: `${Math.min(100,(b.real/b.meta)*100)||0}%`, background: b.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className='text-xs mt-6 p-3 rounded-xl' style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}>
                    💡 A regra 50-30-20 sugere: 50% da renda para necessidades, 30% para desejos e 20% para poupança/investimentos.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: ALERTAS IA ───────────────────────────────────────────── */}
      {activeTab === 'ia' && (
        <div className='space-y-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>🤖 Alertas Inteligentes</h2>
              <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>IA analisando seus dados e padrões financeiros</p>
            </div>
            <button onClick={() => { setAlertasIA(null); setLoadingAlertas(true); api.get('/alertas-ia').then(r => setAlertasIA(r.data)).catch(() => setAlertasIA([])).finally(() => setLoadingAlertas(false)) }}
              className='text-xs font-bold px-4 py-2 rounded-xl border transition hover:bg-green-500/10' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              Atualizar
            </button>
          </div>

          {/* Alertas da IA */}
          {loadingAlertas && (
            <div className='flex items-center justify-center py-20'>
              <div className='flex flex-col items-center gap-3'>
                <div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' />
                <p className='text-xs font-bold' style={{ color: 'var(--text-muted)' }}>IA analisando seus dados...</p>
              </div>
            </div>
          )}

          {!loadingAlertas && alertasIA && alertasIA.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {alertasIA.map((a, i) => {
                const colors = { positivo: { bg: '#22c55e15', border: '#22c55e', icon: '🎉' }, alerta: { bg: '#f59e0b15', border: '#f59e0b', icon: '⚠️' }, dica: { bg: '#3b82f615', border: '#3b82f6', icon: '💡' } }
                const c = colors[a.tipo] || colors.dica
                return (
                  <div key={i} className='rounded-2xl p-5 border-l-4' style={{ background: c.bg, borderLeftColor: c.border, borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-xl'>{c.icon}</span>
                      <span className='font-black text-sm' style={{ color: c.border }}>{a.titulo}</span>
                    </div>
                    <p className='text-sm leading-relaxed' style={{ color: 'var(--text-main)' }}>{a.msg}</p>
                  </div>
                )
              })}
            </div>
          )}

          {!loadingAlertas && alertasIA && alertasIA.length === 0 && (
            <div className='text-center py-16 rounded-2xl border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className='text-5xl block mb-4'>🤖</span>
              <p className='font-bold mb-2' style={{ color: 'var(--text-main)' }}>Nenhum alerta gerado</p>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Registre receitas e despesas para receber insights personalizados.</p>
            </div>
          )}

          {!loadingAlertas && !alertasIA && (
            <div className='text-center py-16 rounded-2xl border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className='text-5xl block mb-4'>🤖</span>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Clique em "Atualizar" para gerar alertas com IA.</p>
            </div>
          )}

          {/* Insights básicos do período */}
          {insights.length > 0 && (
            <div>
              <p className='text-xs font-black uppercase tracking-widest mb-4' style={{ color: 'var(--text-muted)' }}>Análise do Período</p>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {insights.map((ins, i) => {
                  const isWarn = ins.msg.toLowerCase().includes('maior') || ins.msg.toLowerCase().includes('revis')
                  const isGood = ins.msg.toLowerCase().includes('parabén') || ins.msg.toLowerCase().includes('economiz')
                  const accent = isWarn ? '#f59e0b' : isGood ? '#22c55e' : '#3b82f6'
                  return (
                    <div key={i} className='rounded-2xl p-5 border-l-4 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderLeftColor: accent }}>
                      <p className='text-sm leading-relaxed' style={{ color: 'var(--text-main)' }}>{ins.msg}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
