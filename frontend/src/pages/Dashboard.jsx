import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { gerarRelatorioPDF } from '../utils/gerarPDF'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Line,
  ReferenceLine, ComposedChart, Bar
} from 'recharts'

const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#84cc16']

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const iconConta = (desc = '') => {
  const d = desc.toLowerCase()
  if (d.includes('aluguel') || d.includes('moradia')) return '🏠'
  if (d.includes('luz') || d.includes('energia') || d.includes('enel')) return '⚡'
  if (d.includes('internet') || d.includes('fibra') || d.includes('claro') || d.includes('vivo')) return '🌐'
  if (d.includes('agua') || d.includes('água') || d.includes('sabesp')) return '💧'
  if (d.includes('cartao') || d.includes('cartão') || d.includes('nubank') || d.includes('itau') || d.includes('bradesco') || d.includes('inter')) return '💳'
  if (d.includes('academia') || d.includes('gym') || d.includes('smart')) return '🏋️'
  if (d.includes('escola') || d.includes('facul') || d.includes('curso')) return '📚'
  if (d.includes('mercado') || d.includes('super') || d.includes('extra')) return '🛒'
  if (d.includes('seguro') || d.includes('plano') || d.includes('saude') || d.includes('saúde')) return '🏥'
  if (d.includes('gas') || d.includes('gás') || d.includes('comgas')) return '🔥'
  return '📄'
}

const iconReceita = (desc = '') => {
  const d = desc.toLowerCase()
  if (d.includes('salario') || d.includes('salário') || d.includes('pagamento')) return '💼'
  if (d.includes('freelance') || d.includes('freela') || d.includes('projeto')) return '💻'
  if (d.includes('aluguel') || d.includes('alug')) return '🏠'
  if (d.includes('dividendo') || d.includes('invest')) return '📈'
  if (d.includes('bonus') || d.includes('bônus') || d.includes('premio') || d.includes('prêmio')) return '🎁'
  return '💰'
}

function KPICard({ label, value, sub, icon, iconBg, valueColor }) {
  return (
    <div className='rounded-2xl border p-4 flex items-center gap-3 min-w-0'
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className='w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0' style={{ background: iconBg }}>
        {icon}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-[10px] font-bold uppercase tracking-wider leading-tight' style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className='text-sm md:text-base font-black leading-tight truncate mt-0.5' style={{ color: valueColor || 'var(--text-main)' }}>{value}</p>
        {sub && <p className='text-[10px] mt-0.5 font-medium' style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()

  const [data, setData] = useState({
    receitas: 0, despesas: 0, saldo: 0, meta_economia: 0,
    categorias: [],
    historico: mesesLabel.map(m => ({ name: m, receitas: 0, despesas: 0 }))
  })
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())
  const [mesFim, setMesFim] = useState(now.getMonth())
  const [anoFim, setAnoFim] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [patrimonioData, setPatrimonioData] = useState({ patrimonio_liquido: 0, ativos: 0, passivos: 0, conquistas: [], saldo_caixa: 0, a_pagar: 0, investimentos: 0, rendimento: 0 })
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
  const [evolucao, setEvolucao] = useState(null)
  const [loadingEvolucao, setLoadingEvolucao] = useState(false)

  // Widget data
  const [contas, setContas] = useState([])
  const [cartoes, setCartoes] = useState([])
  const [metas, setMetas] = useState([])
  const [receitas, setReceitas] = useState([])

  const customRef = useRef(null)
  const tabNavRef = useRef(null)

  useEffect(() => {
    if (!showCustom) return
    const handler = (e) => { if (customRef.current && !customRef.current.contains(e.target)) setShowCustom(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCustom])

  const TAB_ORDER = ['resumo', 'evolucao', 'projecao', 'saude', 'ia', 'conquistas']
  useEffect(() => {
    if (!tabNavRef.current) return
    const idx = TAB_ORDER.indexOf(activeTab)
    const page = Math.floor(idx / 3)
    tabNavRef.current.scrollTo({ left: page * tabNavRef.current.clientWidth, behavior: 'smooth' })
  }, [activeTab])

  const aplicarPreset = (preset) => {
    const n = new Date()
    const m = n.getMonth(), a = n.getFullYear()
    setActivePreset(preset)
    setShowCustom(preset === 'custom')
    if (preset === 'mes') { setMesSelecionado(m); setAnoSelecionado(a); setMesFim(m); setAnoFim(a) }
    else if (preset === '3m') { const s = new Date(a, m - 2, 1); setMesSelecionado(s.getMonth()); setAnoSelecionado(s.getFullYear()); setMesFim(m); setAnoFim(a) }
    else if (preset === '6m') { const s = new Date(a, m - 5, 1); setMesSelecionado(s.getMonth()); setAnoSelecionado(s.getFullYear()); setMesFim(m); setAnoFim(a) }
    else if (preset === 'ano') { setMesSelecionado(0); setAnoSelecionado(a); setMesFim(11); setAnoFim(a) }
  }

  const carregarDashboard = useCallback(async (opt = {}) => {
    if (opt.showLoading) setLoading(true)
    setRefreshing(true)
    try {
      const [res, pat] = await Promise.all([
        api.get(`/resumo-mensal?mes=${mesSelecionado + 1}&ano=${anoSelecionado}&mes_fim=${mesFim + 1}&ano_fim=${anoFim}`),
        api.get('/patrimonio'),
      ])
      if (res.data) { setData(res.data); localStorage.setItem('dash_cache_data', JSON.stringify(res.data)) }
      if (pat.data) { setPatrimonioData(pat.data); localStorage.setItem('dash_cache_pat', JSON.stringify(pat.data)) }
      try {
        const ins = await api.get('/insights')
        if (ins.data) { setInsights(ins.data); localStorage.setItem('dash_cache_ins', JSON.stringify(ins.data)) }
      } catch {}
      setLastUpdate(new Date())
    } catch (e) { console.error('Erro ao carregar dashboard:', e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [mesSelecionado, anoSelecionado, mesFim, anoFim])

  useEffect(() => {
    const cData = localStorage.getItem('dash_cache_data')
    const cPat = localStorage.getItem('dash_cache_pat')
    const cIns = localStorage.getItem('dash_cache_ins')
    if (cData) try { setData(JSON.parse(cData)) } catch {}
    if (cPat) try { setPatrimonioData(JSON.parse(cPat)) } catch {}
    if (cIns) try { setInsights(JSON.parse(cIns)) } catch {}
    carregarDashboard({ showLoading: !cData })
  }, [carregarDashboard])

  const carregarWidgets = useCallback(() => {
    Promise.allSettled([
      api.get('/contas'),
      api.get('/cartoes'),
      api.get('/metas'),
      api.get('/receitas'),
    ]).then(([c, cart, m, rec]) => {
      if (c.status === 'fulfilled') setContas(c.value.data || [])
      if (cart.status === 'fulfilled') setCartoes(cart.value.data || [])
      if (m.status === 'fulfilled') setMetas(m.value.data || [])
      if (rec.status === 'fulfilled') setReceitas(rec.value.data || [])
    })
  }, [])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') { carregarDashboard(); carregarWidgets() }
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => { window.removeEventListener('focus', refreshIfVisible); document.removeEventListener('visibilitychange', refreshIfVisible) }
  }, [carregarDashboard, carregarWidgets])

  useEffect(() => {
    const chaveRec = `rec_gerada_${now.getFullYear()}_${now.getMonth() + 1}`
    const jaGerou = localStorage.getItem(chaveRec)
    if (!jaGerou) {
      api.post('/recorrencias/gerar').then(() => {
        localStorage.setItem(chaveRec, '1')
        carregarWidgets()
        carregarDashboard()
      }).catch(() => carregarWidgets())
    } else {
      carregarWidgets()
    }
  }, [carregarWidgets, carregarDashboard])

  const chartData = (data?.historico || []).map(d => ({ ...d, saldo: (d.receitas || 0) - (d.despesas || 0) }))
  const totalDespesas = data?.despesas || 0
  const pieData = (data?.categorias || []).map(c => ({ name: c.nome, value: Number(c.total) }))
  const conquistas = patrimonioData?.conquistas || []

  const contasPendentes = contas.filter(c => !c.pago).sort((a, b) => {
    const da = new Date(a.vencimento || a.criado_em || 0)
    const db = new Date(b.vencimento || b.criado_em || 0)
    return da - db
  }).slice(0, 6)

  const totalGastoCartao = cartoes.reduce((s, c) => s + Number(c.total_gasto || 0), 0)
  const totalLimiteCartao = cartoes.reduce((s, c) => s + Number(c.limite || 0), 0)
  const pctLimite = totalLimiteCartao > 0 ? Math.round((totalGastoCartao / totalLimiteCartao) * 100) : 0

  const metaPrincipal = metas[0] || null
  const receitasRecentes = [...receitas].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5)

  const presets = [
    { id: 'mes', label: 'Este Mês' }, { id: '3m', label: 'Últimos 3M' },
    { id: '6m', label: 'Últimos 6M' }, { id: 'ano', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ]
  const periodoLabel = activePreset === 'mes' ? mesesNomes[mesFim]
    : activePreset === 'ano' ? `${anoSelecionado}`
    : `${mesesNomes[mesSelecionado].slice(0, 3)} – ${mesesNomes[mesFim].slice(0, 3)} ${anoFim}`

  if (loading && !data.receitas) return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
      <div className='w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin' />
      <p className='font-black uppercase tracking-widest text-[10px] animate-pulse' style={{ color: 'var(--text-muted)' }}>Carregando dashboard...</p>
    </div>
  )

  const tooltipStyle = { backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '14px', color: 'var(--text-main)', fontSize: 12 }

  return (
    <div className='max-w-7xl mx-auto pb-24 px-0'>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className='flex flex-col gap-4 mb-6 px-4 md:px-0'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl md:text-5xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>Dashboard</h1>
            <div className='flex items-center gap-2 mt-1'>
              <div className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <p className='font-bold text-[10px] uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>
                {refreshing ? 'Atualizando...' : lastUpdate ? `Atualizado ${lastUpdate.toLocaleTimeString()}` : 'Pronto'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <p className='text-xs font-semibold hidden md:block' style={{ color: 'var(--text-muted)' }}>
              Período: <span style={{ color: 'var(--text-main)' }}>{periodoLabel}</span>
            </p>
            <button onClick={() => gerarRelatorioPDF({ data, patrimonioData, periodoLabel })}
              className='flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition hover:bg-green-500/10'
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              📄 <span className='hidden sm:inline'>PDF</span>
            </button>
          </div>
        </div>

        {/* Pills */}
        <div className='-mx-4 md:mx-0'>
          <div className='flex overflow-x-auto hide-scrollbar md:gap-2' style={{ scrollSnapType: 'x mandatory' }}>
            {presets.map(p => (
              <div key={p.id} className='snap-item-3'>
                <button onClick={() => aplicarPreset(p.id)}
                  className={`w-full py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                    activePreset === p.id ? 'bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/20' : 'border-[var(--border-color)] hover:border-green-500/40'
                  }`}
                  style={activePreset !== p.id ? { background: 'var(--bg-card)', color: 'var(--text-muted)' } : {}}>
                  {p.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {showCustom && (
          <div ref={customRef} className='border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3'
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {[['De', mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado], ['Até', mesFim, setMesFim, anoFim, setAnoFim]].map(([lbl, ms, setMs, an, setAn]) => (
              <div key={lbl} className='flex flex-col gap-1.5'>
                <span className='text-[10px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                <div className='flex gap-2'>
                  <select value={ms} onChange={e => setMs(Number(e.target.value))}
                    className='flex-1 min-w-0 border rounded-xl px-2 py-2.5 text-sm outline-none'
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                    {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={an} onChange={e => setAn(Number(e.target.value))}
                    className='w-20 border rounded-xl px-2 py-2.5 text-sm outline-none'
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                    {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <div className='flex flex-col justify-end'>
              <button onClick={() => { carregarDashboard(); setShowCustom(false) }}
                className='w-full bg-green-500 text-black font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider'>
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Nav ────────────────────────────────────────────────────── */}
      <div className='mb-6 mx-4 md:mx-0 rounded-[2.5rem] border p-1.5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div ref={tabNavRef} className='flex overflow-x-auto hide-scrollbar' style={{ scrollSnapType: 'x mandatory' }}>
          {[
            { id: 'resumo', label: 'Resumo', icon: '📊' },
            { id: 'evolucao', label: 'Evolução', icon: '📈' },
            { id: 'projecao', label: 'Projeção', icon: '🔮' },
            { id: 'saude', label: 'Saúde', icon: '❤️' },
            { id: 'ia', label: 'Alertas', icon: '🤖' },
            { id: 'conquistas', label: 'Troféus', icon: '🏆' },
          ].map(tab => (
            <div key={tab.id} className='snap-item-3'>
              <button
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'evolucao' && !evolucao && !loadingEvolucao) {
                    setLoadingEvolucao(true)
                    api.get('/historico-patrimonio?dias=90').then(r => setEvolucao(r.data)).catch(() => setEvolucao([])).finally(() => setLoadingEvolucao(false))
                  }
                  if (tab.id === 'projecao' && !projecao && !loadingProjecao) {
                    setLoadingProjecao(true)
                    api.get('/projecao?meses=6').then(r => setProjecao(r.data)).catch(() => setProjecao({})).finally(() => setLoadingProjecao(false))
                  }
                  if (tab.id === 'saude' && !saude && !loadingSaude) {
                    setLoadingSaude(true)
                    api.get(`/saude-financeira?mes=${now.getMonth() + 1}&ano=${now.getFullYear()}`).then(r => setSaude(r.data)).catch(() => setSaude({})).finally(() => setLoadingSaude(false))
                  }
                  if (tab.id === 'ia' && !alertasIA && !loadingAlertas) {
                    setLoadingAlertas(true)
                    api.get('/alertas-ia').then(r => setAlertasIA(r.data)).catch(() => setAlertasIA([])).finally(() => setLoadingAlertas(false))
                  }
                }}
                className={`w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id ? 'bg-green-500 text-black shadow-lg' : 'hover:bg-green-500/10'
                }`}
                style={activeTab !== tab.id ? { color: 'var(--text-muted)' } : {}}>
                <span className='text-lg'>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: RESUMO — novo layout estilo dashboard
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'resumo' && (
        <div className='space-y-5 px-4 md:px-0'>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3'>
            <KPICard label='Receitas no mês' value={fmt(data.receitas)} sub={periodoLabel}
              icon='💰' iconBg='rgba(34,197,94,0.15)' valueColor='#22c55e' />
            <KPICard label='Despesas no mês' value={fmt(data.despesas)} sub={periodoLabel}
              icon='💸' iconBg='rgba(239,68,68,0.15)' valueColor='#ef4444' />
            <KPICard
              label='Saldo do mês' value={fmt(data.saldo)} sub={periodoLabel}
              icon='📊' iconBg='rgba(59,130,246,0.15)'
              valueColor={(data.saldo || 0) >= 0 ? '#22c55e' : '#ef4444'} />
            <KPICard label='Meta de economia' value={`${Math.round(data.meta_economia || 0)}%`} sub='economizado'
              icon='🎯' iconBg='rgba(168,85,247,0.15)' valueColor='#a855f7' />
            <KPICard label='Patrimônio líquido' value={fmt(patrimonioData.patrimonio_liquido)} sub='total acumulado'
              icon='💎' iconBg='rgba(245,158,11,0.15)'
              valueColor={(patrimonioData.patrimonio_liquido || 0) >= 0 ? '#f59e0b' : '#ef4444'} />
          </div>

          {/* ── Gráfico + Categorias + Contas ──────────────────────────── */}
          <div className='grid grid-cols-1 xl:grid-cols-4 gap-5'>

            {/* Receitas x Despesas — bar chart */}
            <div className='xl:col-span-2 rounded-2xl border p-5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Receitas x Despesas</h3>
                <span className='text-[10px] font-bold px-2 py-1 rounded-lg' style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>12 meses</span>
              </div>
              <div className='h-52 md:h-60'>
                <ResponsiveContainer width='100%' height='100%'>
                  <ComposedChart data={chartData} barGap={2}>
                    <XAxis dataKey='name' stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={35} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(v), n === 'receitas' ? 'Receitas' : n === 'despesas' ? 'Despesas' : 'Saldo']} />
                    <Bar dataKey='receitas' fill='#22c55e' radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey='despesas' fill='#ef4444' radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Line type='monotone' dataKey='saldo' stroke='#3b82f6' strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className='flex gap-4 mt-3 justify-center'>
                {[{ color: '#22c55e', label: 'Receitas' }, { color: '#ef4444', label: 'Despesas' }, { color: '#3b82f6', label: 'Saldo' }].map(l => (
                  <div key={l.label} className='flex items-center gap-1.5'>
                    <div className='w-3 h-3 rounded-sm' style={{ background: l.color }} />
                    <span className='text-[10px] font-bold' style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas por Categoria */}
            <div className='rounded-2xl border p-5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Por Categoria</h3>
                <span className='text-[10px] font-bold px-2 py-1 rounded-lg' style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{periodoLabel}</span>
              </div>
              {pieData.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-48 gap-2'>
                  <span className='text-3xl'>📊</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Sem despesas no período</p>
                </div>
              ) : (
                <>
                  <div className='h-32'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie data={pieData} innerRadius={42} outerRadius={58} paddingAngle={3} dataKey='value' startAngle={90} endAngle={-270}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [fmt(v), 'Total']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className='space-y-1.5 mt-2'>
                    {pieData.slice(0, 5).map((c, i) => (
                      <div key={i} className='flex items-center justify-between'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className='w-2.5 h-2.5 rounded-full shrink-0' style={{ background: COLORS[i % COLORS.length] }} />
                          <span className='text-[11px] font-medium truncate' style={{ color: 'var(--text-main)' }}>{c.name}</span>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
                            {totalDespesas > 0 ? `${Math.round((c.value / totalDespesas) * 100)}%` : '0%'}
                          </span>
                          <span className='text-[11px] font-bold' style={{ color: 'var(--text-main)' }}>
                            {fmt(c.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pieData.length > 5 && (
                      <p className='text-[10px] text-center pt-1' style={{ color: 'var(--text-muted)' }}>+{pieData.length - 5} categorias</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Contas a Pagar */}
            <div className='rounded-2xl border flex flex-col' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
                <div className='flex items-center gap-2'>
                  <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Contas a Pagar</h3>
                  {contasPendentes.length > 0 && (
                    <span className='w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center'>{contasPendentes.length}</span>
                  )}
                </div>
                <button onClick={() => navigate('/carteira?tab=contas')} className='text-[10px] font-bold text-green-500 hover:text-green-400 transition'>Ver todas</button>
              </div>
              <div className='flex-1 overflow-hidden'>
                {contasPendentes.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-8 gap-2'>
                    <span className='text-3xl'>✅</span>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhuma conta pendente</p>
                  </div>
                ) : (
                  <div className='divide-y' style={{ borderColor: 'var(--border-color)' }}>
                    {contasPendentes.map((c, i) => (
                      <div key={c.id || i} className='flex items-center gap-3 px-5 py-3'>
                        <div className='w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0'
                          style={{ background: 'var(--bg-input)' }}>
                          {iconConta(c.descricao)}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs font-bold truncate' style={{ color: 'var(--text-main)' }}>{c.descricao}</p>
                          {c.categoria_nome && <p className='text-[10px]' style={{ color: 'var(--text-muted)' }}>{c.categoria_nome}</p>}
                        </div>
                        <p className='text-xs font-black shrink-0mr-2' style={{ color: '#ef4444' }}>{fmt(c.valor)}</p>
                        <button
                          onClick={() => api.patch(`/contas/${c.id}`, { pago: true }).then(() => {
                            setContas(prev => prev.map(x => x.id === c.id ? { ...x, pago: true } : x))
                            carregarDashboard()
                          })}
                          className='w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors'
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                          title='Marcar como pago'>
                          ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {contasPendentes.length > 0 && (
                <div className='px-5 py-3 border-t shrink-0' style={{ borderColor: 'var(--border-color)' }}>
                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] font-bold uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>Total pendente</span>
                    <span className='text-sm font-black' style={{ color: '#ef4444' }}>
                      {fmt(contasPendentes.reduce((s, c) => s + Number(c.valor || 0), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Widgets Row ────────────────────────────────────────────── */}
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5'>

            {/* Gastos no Cartão */}
            <div className='rounded-2xl border p-5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Gastos no Cartão</h3>
                <button onClick={() => navigate('/carteira?tab=compras')} className='text-[10px] font-bold text-green-500 hover:text-green-400 transition'>Ver tudo</button>
              </div>
              {cartoes.length === 0 ? (
                <div className='flex flex-col items-center py-6 gap-2'>
                  <span className='text-3xl'>💳</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhum cartão cadastrado</p>
                </div>
              ) : (
                <>
                  <div className='mb-4'>
                    <p className='text-[10px] font-bold uppercase tracking-wider mb-1' style={{ color: 'var(--text-muted)' }}>Total gasto</p>
                    <p className='text-2xl font-black' style={{ color: 'var(--text-main)' }}>{fmt(totalGastoCartao)}</p>
                  </div>
                  <div className='mb-2'>
                    <div className='flex justify-between mb-1.5'>
                      <span className='text-[10px] font-bold' style={{ color: 'var(--text-muted)' }}>Limite utilizado</span>
                      <span className='text-[10px] font-black' style={{ color: pctLimite > 80 ? '#ef4444' : pctLimite > 60 ? '#f59e0b' : '#22c55e' }}>{pctLimite}%</span>
                    </div>
                    <div className='h-2 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                      <div className='h-full rounded-full transition-all duration-500'
                        style={{ width: `${Math.min(100, pctLimite)}%`, background: pctLimite > 80 ? '#ef4444' : pctLimite > 60 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                    <p className='text-[10px] mt-1' style={{ color: 'var(--text-muted)' }}>{fmt(totalGastoCartao)} / {fmt(totalLimiteCartao)}</p>
                  </div>
                </>
              )}
            </div>

            {/* Resumo dos Cartões */}
            <div className='rounded-2xl border flex flex-col' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Resumo dos Cartões</h3>
                <button onClick={() => navigate('/carteira?tab=cartoes')} className='text-[10px] font-bold text-green-500 hover:text-green-400 transition'>Ver todos</button>
              </div>
              {cartoes.length === 0 ? (
                <div className='flex flex-col items-center py-6 gap-2'>
                  <span className='text-3xl'>💳</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhum cartão</p>
                </div>
              ) : (
                <div className='divide-y flex-1' style={{ borderColor: 'var(--border-color)' }}>
                  {cartoes.slice(0, 4).map((c, i) => {
                    const pct = c.limite > 0 ? Math.round((Number(c.total_gasto || 0) / Number(c.limite)) * 100) : 0
                    return (
                      <div key={c.id || i} className='px-5 py-3'>
                        <div className='flex items-center justify-between mb-1.5'>
                          <div className='flex items-center gap-2'>
                            <div className='w-7 h-7 rounded-lg flex items-center justify-center text-base' style={{ background: 'var(--bg-input)' }}>💳</div>
                            <div>
                              <p className='text-[11px] font-bold' style={{ color: 'var(--text-main)' }}>{c.nome}</p>
                              <p className='text-[10px]' style={{ color: 'var(--text-muted)' }}>Limite: {fmt(c.limite)}</p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-[11px] font-black' style={{ color: 'var(--text-main)' }}>{fmt(c.total_gasto)}</p>
                            <p className='text-[10px]' style={{ color: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e' }}>{pct}%</p>
                          </div>
                        </div>
                        <div className='h-1.5 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                          <div className='h-full rounded-full' style={{ width: `${Math.min(100, pct)}%`, background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Patrimônio */}
            <div className='rounded-2xl border p-5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h3 className='font-black text-sm mb-4' style={{ color: 'var(--text-main)' }}>Patrimônio</h3>
              <div className='space-y-3'>
                {[
                  { label: '💵 Em Caixa', value: patrimonioData.saldo_caixa, color: '#22c55e' },
                  { label: '📈 Investido', value: patrimonioData.investimentos, color: '#3b82f6' },
                  { label: '⚠️ A Pagar', value: -(patrimonioData.a_pagar || 0), color: '#f59e0b' },
                  { label: '🔥 Rendimento', value: patrimonioData.rendimento, color: (patrimonioData.rendimento || 0) >= 0 ? '#22c55e' : '#ef4444' },
                ].map(item => (
                  <div key={item.label} className='flex items-center justify-between'>
                    <span className='text-xs font-medium' style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span className='text-xs font-black' style={{ color: item.color }}>
                      {(item.value || 0) >= 0 ? '' : '-'}{fmt(Math.abs(item.value || 0))}
                    </span>
                  </div>
                ))}
                <div className='border-t pt-3' style={{ borderColor: 'var(--border-color)' }}>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-black' style={{ color: 'var(--text-main)' }}>💎 Patrimônio Líq.</span>
                    <span className='text-sm font-black' style={{ color: '#f59e0b' }}>{fmt(patrimonioData.patrimonio_liquido)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receitas Recentes */}
            <div className='rounded-2xl border flex flex-col' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between px-5 pt-4 pb-3 shrink-0'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Receitas Recentes</h3>
                <button onClick={() => navigate('/carteira?tab=receitas')} className='text-[10px] font-bold text-green-500 hover:text-green-400 transition'>Ver todas</button>
              </div>
              {receitasRecentes.length === 0 ? (
                <div className='flex flex-col items-center py-6 gap-2'>
                  <span className='text-3xl'>💰</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhuma receita ainda</p>
                </div>
              ) : (
                <div className='divide-y flex-1' style={{ borderColor: 'var(--border-color)' }}>
                  {receitasRecentes.map((r, i) => (
                    <div key={r.id || i} className='flex items-center gap-3 px-5 py-3'>
                      <div className='w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0' style={{ background: 'rgba(34,197,94,0.1)' }}>
                        {iconReceita(r.descricao)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-bold truncate' style={{ color: 'var(--text-main)' }}>{r.descricao}</p>
                        {r.categoria_nome && <p className='text-[10px]' style={{ color: 'var(--text-muted)' }}>{r.categoria_nome}</p>}
                      </div>
                      <p className='text-xs font-black shrink-0 text-green-500'>{fmt(r.valor)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Metas ──────────────────────────────────────────────────── */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>

            {/* Metas — principal com circular */}
            <div className='rounded-2xl border p-5 flex flex-col items-center justify-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between w-full mb-4'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Minhas Metas</h3>
                <button onClick={() => navigate('/metas')} className='text-[10px] font-bold text-green-500 hover:text-green-400 transition'>Ver todas</button>
              </div>
              {!metaPrincipal ? (
                <div className='flex flex-col items-center py-4 gap-2'>
                  <span className='text-3xl'>🎯</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhuma meta cadastrada</p>
                  <button onClick={() => navigate('/metas')} className='text-[10px] font-bold text-green-500 mt-1'>Criar meta</button>
                </div>
              ) : (
                <>
                  <div className='relative w-32 h-32 flex items-center justify-center my-2'>
                    <svg className='w-full h-full -rotate-90' viewBox='0 0 120 120'>
                      <circle cx='60' cy='60' r='50' stroke='var(--border-color)' strokeWidth='10' fill='none' />
                      <circle cx='60' cy='60' r='50' stroke='#22c55e' strokeWidth='10' fill='none'
                        strokeDasharray={314.16}
                        strokeDashoffset={314.16 - (314.16 * Math.min(100, Math.max(0, metaPrincipal.progresso || 0))) / 100}
                        strokeLinecap='round' />
                    </svg>
                    <div className='absolute inset-0 flex flex-col items-center justify-center'>
                      <span className='text-2xl font-black' style={{ color: 'var(--text-main)' }}>{Math.round(metaPrincipal.progresso || 0)}%</span>
                    </div>
                  </div>
                  <p className='font-black text-sm mt-1' style={{ color: 'var(--text-main)' }}>{metaPrincipal.titulo}</p>
                  <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                    {fmt(metaPrincipal.valor_atual)} <span style={{ color: 'var(--border-color)' }}>de</span> {fmt(metaPrincipal.valor_alvo)}
                  </p>
                </>
              )}
            </div>

            {/* Metas — lista completa */}
            <div className='md:col-span-2 rounded-2xl border flex flex-col' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='px-5 pt-4 pb-3 shrink-0'>
                <h3 className='font-black text-sm' style={{ color: 'var(--text-main)' }}>Progresso das Metas</h3>
              </div>
              {metas.length === 0 ? (
                <div className='flex flex-col items-center py-8 gap-2'>
                  <span className='text-3xl'>🎯</span>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Nenhuma meta ainda</p>
                </div>
              ) : (
                <div className='divide-y flex-1' style={{ borderColor: 'var(--border-color)' }}>
                  {metas.slice(0, 5).map((m, i) => (
                    <div key={m.id || i} className='px-5 py-3.5'>
                      <div className='flex items-center justify-between mb-2'>
                        <p className='text-xs font-bold' style={{ color: 'var(--text-main)' }}>{m.titulo}</p>
                        <span className='text-xs font-black' style={{ color: (m.progresso || 0) >= 80 ? '#22c55e' : (m.progresso || 0) >= 50 ? '#f59e0b' : 'var(--text-muted)' }}>
                          {Math.round(m.progresso || 0)}%
                        </span>
                      </div>
                      <div className='h-2 rounded-full overflow-hidden mb-1.5' style={{ background: 'var(--bg-input)' }}>
                        <div className='h-full rounded-full transition-all duration-500'
                          style={{ width: `${Math.min(100, m.progresso || 0)}%`, background: (m.progresso || 0) >= 80 ? '#22c55e' : (m.progresso || 0) >= 50 ? '#f59e0b' : '#3b82f6' }} />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>{fmt(m.valor_atual)}</span>
                        <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>meta: {fmt(m.valor_alvo)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Score de Poupança + Insights ───────────────────────────── */}
          {(insights.length > 0 || data.meta_economia > 0) && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
              {/* Taxa de poupança */}
              <div className='rounded-2xl border p-5 flex flex-col items-center justify-center text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className='text-[10px] font-black uppercase tracking-widest mb-1' style={{ color: '#a855f7' }}>Taxa de Poupança</p>
                <p className='text-xs mb-4' style={{ color: 'var(--text-muted)' }}>{periodoLabel}</p>
                <div className='relative w-28 h-28 flex items-center justify-center'>
                  <svg className='w-full h-full -rotate-90' viewBox='0 0 112 112'>
                    <circle cx='56' cy='56' r='46' stroke='var(--border-color)' strokeWidth='9' fill='none' />
                    <circle cx='56' cy='56' r='46' stroke='#22c55e' strokeWidth='9' fill='none'
                      strokeDasharray={289.03}
                      strokeDashoffset={289.03 - (289.03 * Math.min(100, Math.max(0, data.meta_economia || 0))) / 100}
                      strokeLinecap='round' />
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-2xl font-black' style={{ color: 'var(--text-main)' }}>{Math.round(data.meta_economia || 0)}%</span>
                    <span className='text-[9px] font-bold' style={{ color: 'var(--text-muted)' }}>economizado</span>
                  </div>
                </div>
                <p className='text-xs mt-4 font-semibold' style={{ color: (data.meta_economia || 0) >= 20 ? '#22c55e' : '#f59e0b' }}>
                  {(data.meta_economia || 0) >= 30 ? 'Excelente ritmo! 🚀' : (data.meta_economia || 0) >= 20 ? 'Ótima poupança! 👍' : (data.meta_economia || 0) > 0 ? 'Pode melhorar ⚡' : 'Sem receitas no período'}
                </p>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className='md:col-span-2 rounded-2xl border p-5' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <h3 className='font-black text-sm mb-4' style={{ color: 'var(--text-main)' }}>💡 Insights do Período</h3>
                  <div className='space-y-3'>
                    {insights.slice(0, 4).map((ins, i) => {
                      const isWarn = ins.msg.toLowerCase().includes('maior') || ins.msg.toLowerCase().includes('revis')
                      const isGood = ins.msg.toLowerCase().includes('parabén') || ins.msg.toLowerCase().includes('economiz')
                      const accent = isWarn ? '#f59e0b' : isGood ? '#22c55e' : '#3b82f6'
                      return (
                        <div key={i} className='flex gap-3 p-3 rounded-xl' style={{ background: 'var(--bg-input)' }}>
                          <div className='w-1 rounded-full shrink-0' style={{ background: accent }} />
                          <p className='text-xs leading-relaxed' style={{ color: 'var(--text-main)' }}>{ins.msg}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: EVOLUÇÃO ══════════════════════════════════════════════ */}
      {activeTab === 'evolucao' && (
        <div className='space-y-8 px-4 md:px-0'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>📈 Evolução do Patrimônio</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Histórico dos últimos 90 dias — snapshot diário automático</p>
          </div>
          {loadingEvolucao && <div className='flex items-center justify-center py-20'><div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' /></div>}
          {!loadingEvolucao && evolucao && evolucao.length === 0 && (
            <div className='text-center py-20 rounded-2xl border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className='text-5xl block mb-4'>📊</span>
              <p className='font-bold mb-2' style={{ color: 'var(--text-main)' }}>Nenhum histórico ainda</p>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>O snapshot é salvo automaticamente ao abrir o Dashboard. Volte amanhã para ver a evolução!</p>
            </div>
          )}
          {!loadingEvolucao && evolucao && evolucao.length > 0 && (() => {
            const primeiro = evolucao[0]?.patrimonio_liquido || 0
            const ultimo = evolucao[evolucao.length - 1]?.patrimonio_liquido || 0
            const variacao = ultimo - primeiro
            const varPct = primeiro > 0 ? ((variacao / Math.abs(primeiro)) * 100).toFixed(1) : 0
            return (
              <>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  {[
                    { label: 'Patrimônio Atual', value: fmt(ultimo), color: '#22c55e' },
                    { label: 'Variação no Período', value: `${variacao >= 0 ? '+' : ''}${fmt(variacao)}`, color: variacao >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Crescimento %', value: `${varPct >= 0 ? '+' : ''}${varPct}%`, color: varPct >= 0 ? '#22c55e' : '#ef4444' },
                  ].map(c => (
                    <div key={c.label} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <p className='text-xs font-bold uppercase tracking-widest mb-2' style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                      <p className='text-2xl font-black' style={{ color: c.color }}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <p className='text-xs font-bold uppercase tracking-widest mb-6' style={{ color: 'var(--text-muted)' }}>Patrimônio Líquido</p>
                  <ResponsiveContainer width='100%' height={280}>
                    <AreaChart data={evolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id='gradPat' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#22c55e' stopOpacity={0.3} />
                          <stop offset='95%' stopColor='#22c55e' stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id='gradInv' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.2} />
                          <stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey='data' tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={d => { const p = d.split('-'); return `${p[2]}/${p[1]}` }} interval='preserveStartEnd' />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(v), n === 'patrimonio_liquido' ? 'Patrimônio' : n === 'investido' ? 'Investido' : 'Em Caixa']} labelFormatter={d => { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }} />
                      <Area type='monotone' dataKey='patrimonio_liquido' stroke='#22c55e' strokeWidth={2.5} fill='url(#gradPat)' dot={false} />
                      <Area type='monotone' dataKey='investido' stroke='#3b82f6' strokeWidth={1.5} fill='url(#gradInv)' dot={false} strokeDasharray='4 2' />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className='flex gap-6 mt-4 justify-center'>
                    {[{ color: '#22c55e', label: 'Patrimônio Líquido' }, { color: '#3b82f6', label: 'Investido' }].map(l => (
                      <div key={l.label} className='flex items-center gap-2'>
                        <div className='w-4 h-1 rounded-full' style={{ background: l.color }} />
                        <span className='text-xs' style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <p className='text-xs font-bold uppercase tracking-widest mb-6' style={{ color: 'var(--text-muted)' }}>Em Caixa vs A Pagar</p>
                  <ResponsiveContainer width='100%' height={180}>
                    <AreaChart data={evolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey='data' tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={d => { const p = d.split('-'); return `${p[2]}/${p[1]}` }} interval='preserveStartEnd' />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `R$${v.toFixed(0)}`} width={55} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(v), n === 'em_caixa' ? 'Em Caixa' : 'A Pagar']} />
                      <Area type='monotone' dataKey='em_caixa' stroke='#22c55e' strokeWidth={2} fill='rgba(34,197,94,0.1)' dot={false} />
                      <Area type='monotone' dataKey='a_pagar' stroke='#f59e0b' strokeWidth={2} fill='rgba(245,158,11,0.1)' dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ══ TAB: PROJEÇÃO ══════════════════════════════════════════════ */}
      {activeTab === 'projecao' && (
        <div className='space-y-8 px-4 md:px-0'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>🔮 Projeção de Fluxo de Caixa</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Baseada na média dos últimos 3 meses + recorrências ativas</p>
          </div>
          {loadingProjecao && <div className='flex items-center justify-center py-20'><div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' /></div>}
          {!loadingProjecao && projecao && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {[
                  { label: 'Receita Mensal Estimada', val: projecao.media_receita, color: '#22c55e' },
                  { label: 'Despesa Mensal Estimada', val: projecao.media_despesa, color: '#ef4444' },
                  { label: 'Saldo Líquido Mensal', val: (projecao.media_receita || 0) - (projecao.media_despesa || 0), color: ((projecao.media_receita || 0) - (projecao.media_despesa || 0)) >= 0 ? '#22c55e' : '#ef4444' },
                ].map(c => (
                  <div key={c.label} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <p className='text-xs font-bold uppercase tracking-widest mb-2' style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                    <p className='text-2xl font-black' style={{ color: c.color }}>{fmt(c.val)}</p>
                  </div>
                ))}
              </div>
              <div className='rounded-[2.5rem] p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className='text-xs font-black uppercase tracking-widest mb-6' style={{ color: 'var(--text-muted)' }}>Saldo Projetado — Próximos 6 Meses</p>
                <ResponsiveContainer width='100%' height={280}>
                  <AreaChart data={projecao.projecoes || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id='projGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#22c55e' stopOpacity={0.3} />
                        <stop offset='95%' stopColor='#22c55e' stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey='mes' tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                    <ReferenceLine y={0} stroke='#ef4444' strokeDasharray='4 4' strokeOpacity={0.5} />
                    <Tooltip formatter={v => [fmt(v), 'Saldo']} contentStyle={tooltipStyle} />
                    <Area type='monotone' dataKey='saldo' stroke='#22c55e' strokeWidth={2.5} fill='url(#projGrad)' dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
                {(projecao.projecoes || []).some(p => p.saldo < 0) && (
                  <p className='text-xs text-red-400 mt-4 font-semibold'>⚠️ Atenção: projeção indica saldo negativo em alguns meses.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ TAB: SAÚDE ═════════════════════════════════════════════════ */}
      {activeTab === 'saude' && (
        <div className='space-y-8 px-4 md:px-0'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>❤️ Saúde Financeira</h2>
            <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>Score e análise da sua situação financeira atual</p>
          </div>
          {loadingSaude && <div className='flex items-center justify-center py-20'><div className='w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin' /></div>}
          {!loadingSaude && saude && (
            <>
              <div className='rounded-[2.5rem] p-8 border relative overflow-hidden' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className='flex flex-col md:flex-row md:items-center gap-8'>
                  <div className='flex flex-col items-center justify-center w-40 h-40 rounded-full border-8 shrink-0 mx-auto md:mx-0'
                    style={{ borderColor: (saude.score || 0) >= 70 ? '#22c55e' : (saude.score || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>
                    <span className='text-5xl font-black' style={{ color: (saude.score || 0) >= 70 ? '#22c55e' : (saude.score || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>{saude.score || 0}</span>
                    <span className='text-xs font-bold' style={{ color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-2xl font-black mb-1' style={{ color: 'var(--text-main)' }}>
                      {(saude.score || 0) >= 80 ? '🏆 Excelente' : (saude.score || 0) >= 60 ? '😊 Bom' : (saude.score || 0) >= 40 ? '⚠️ Regular' : '🚨 Atenção'}
                    </h3>
                    <p className='text-sm mb-4' style={{ color: 'var(--text-muted)' }}>
                      {(saude.score || 0) >= 80 ? 'Sua vida financeira está muito bem organizada!' : (saude.score || 0) >= 60 ? 'Bom progresso — continue melhorando.' : (saude.score || 0) >= 40 ? 'Há espaço para melhorar.' : 'Alguns pontos precisam de atenção.'}
                    </p>
                    <div className='h-3 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                      <div className='h-full rounded-full transition-all duration-700'
                        style={{ width: `${saude.score || 0}%`, background: (saude.score || 0) >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : (saude.score || 0) >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : '#ef4444' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {(saude.fatores || []).map((f, i) => (
                  <div key={i} className='rounded-2xl p-5 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xl'>{f.icone}</span>
                        <span className='font-bold text-sm' style={{ color: 'var(--text-main)' }}>{f.fator}</span>
                      </div>
                      <span className='font-black text-sm' style={{ color: f.pts === f.max ? '#22c55e' : f.pts >= f.max * 0.6 ? '#f59e0b' : '#ef4444' }}>{f.pts}/{f.max} pts</span>
                    </div>
                    <div className='h-2 rounded-full overflow-hidden mb-2' style={{ background: 'var(--bg-input)' }}>
                      <div className='h-full rounded-full' style={{ width: `${(f.pts / f.max) * 100}%`, background: f.pts === f.max ? '#22c55e' : f.pts >= f.max * 0.6 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>{f.msg}</p>
                  </div>
                ))}
              </div>
              {saude.receita > 0 && (
                <div className='rounded-[2.5rem] p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <p className='text-xs font-black uppercase tracking-widest mb-6' style={{ color: 'var(--accent)' }}>Regra 50 · 30 · 20</p>
                  <div className='space-y-5'>
                    {[
                      { label: 'Necessidades', pct: 50, real: saude.regra_50_30_20?.necessidades?.real, meta: saude.regra_50_30_20?.necessidades?.meta, color: '#3b82f6' },
                      { label: 'Desejos', pct: 30, real: saude.regra_50_30_20?.desejos?.real, meta: saude.regra_50_30_20?.desejos?.meta, color: '#a855f7' },
                      { label: 'Poupança', pct: 20, real: saude.regra_50_30_20?.poupanca?.real, meta: saude.regra_50_30_20?.poupanca?.meta, color: '#22c55e' },
                    ].map(b => (
                      <div key={b.label}>
                        <div className='flex justify-between text-sm mb-2'>
                          <span className='font-bold' style={{ color: 'var(--text-main)' }}>{b.label} <span className='font-normal' style={{ color: 'var(--text-muted)' }}>({b.pct}%)</span></span>
                          <span style={{ color: 'var(--text-muted)' }}>{fmt(b.real)} <span className='text-xs'>/ meta {fmt(b.meta)}</span></span>
                        </div>
                        <div className='h-3 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
                          <div className='h-full rounded-full transition-all duration-500' style={{ width: `${Math.min(100, (b.real / b.meta) * 100) || 0}%`, background: b.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ TAB: ALERTAS IA ════════════════════════════════════════════ */}
      {activeTab === 'ia' && (
        <div className='space-y-8 px-4 md:px-0'>
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
                const colors = { positivo: { bg: '#22c55e15', border: '#22c55e' }, alerta: { bg: '#f59e0b15', border: '#f59e0b' }, dica: { bg: '#3b82f615', border: '#3b82f6' } }
                const c = colors[a.tipo] || colors.dica
                return (
                  <div key={i} className='rounded-2xl p-5 border-l-4' style={{ background: c.bg, borderLeftColor: c.border, borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                    <div className='flex items-center gap-2 mb-2'>
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

      {/* ══ TAB: CONQUISTAS ════════════════════════════════════════════ */}
      {activeTab === 'conquistas' && (
        <div className='space-y-8 px-4 md:px-0'>
          <div>
            <h2 className='text-3xl font-black' style={{ color: 'var(--text-main)' }}>🏆 Troféus</h2>
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
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className='w-16 h-16 rounded-[1.5rem] mb-4 flex items-center justify-center text-3xl' style={{ background: 'rgba(34,197,94,0.12)' }}>
                    {c.icone}
                  </div>
                  <h4 className='font-black text-sm mb-2' style={{ color: 'var(--text-main)' }}>{c.titulo}</h4>
                  <p className='text-[10px] leading-relaxed' style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
                  <div className='mt-3 flex items-center gap-1'>
                    <div className='w-2 h-2 rounded-full bg-green-500' />
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
