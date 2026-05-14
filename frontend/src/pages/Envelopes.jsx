import { useEffect, useState } from 'react'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'

const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const anos = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)

export default function Envelopes() {
  const toast = useToast()
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [envelopes, setEnvelopes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [renda, setRenda] = useState(0)
  const [catSel, setCatSel] = useState('')
  const [alocado, setAlocado] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  const carregar = () => {
    api.get(`/envelopes?mes=${mes}&ano=${ano}`).then(r => setEnvelopes(r.data)).catch(() => {})
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
    api.get(`/envelopes/renda?mes=${mes}&ano=${ano}`).then(r => setRenda(r.data.renda)).catch(() => {})
  }

  useEffect(() => { carregar() }, [mes, ano])

  const totalAlocado = envelopes.reduce((s, e) => s + e.alocado, 0)
  const totalGasto   = envelopes.reduce((s, e) => s + e.gasto, 0)
  const restante     = renda - totalAlocado

  const salvar = async () => {
    if (!catSel || !alocado || Number(alocado) <= 0) return toast('Selecione categoria e valor.', 'warning')
    setLoading(true)
    try {
      await api.post('/envelopes', { categoria_id: Number(catSel), alocado: Number(alocado), mes, ano })
      toast('Envelope salvo!', 'success')
      setShowForm(false); setCatSel(''); setAlocado('')
      carregar()
    } catch { toast('Erro ao salvar.', 'error') }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    try { await api.delete(`/envelopes/${id}`); carregar() }
    catch { toast('Erro ao excluir.', 'error') }
  }

  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const catsDisponiveis = categorias.filter(c => !envelopes.some(e => e.categoria_id === c.id))

  const statusRestante = restante < 0 ? 'text-red-500' : restante === 0 ? 'text-green-500' : 'text-yellow-500'
  const statusMsg = restante < 0 ? 'Alocado além da renda!' : restante === 0 ? 'Perfeito! Tudo alocado.' : `Faltam ${fmt(restante)} para alocar`

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-4xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>Envelopes</h1>
          <p className='mt-1 text-sm' style={{ color: 'var(--text-muted)' }}>Orçamento base-zero — distribua cada real da sua renda</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className='rounded-xl px-4 py-2.5 border text-sm outline-none' style={inputStyle}>
            {mesesNomes.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className='rounded-xl px-4 py-2.5 border text-sm outline-none' style={inputStyle}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className='bg-green-500 text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-green-400 transition text-sm'>
            + Novo Envelope
          </button>
        </div>
      </div>

      {/* Resumo geral */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        {[
          { label: 'Renda do Mês',     value: fmt(renda),        color: '#22c55e' },
          { label: 'Total Alocado',    value: fmt(totalAlocado), color: 'var(--text-main)' },
          { label: 'Total Gasto',      value: fmt(totalGasto),   color: totalGasto > totalAlocado ? '#ef4444' : '#f59e0b' },
          { label: 'Não Alocado',      value: fmt(Math.abs(restante)), color: restante < 0 ? '#ef4444' : restante === 0 ? '#22c55e' : '#f59e0b' },
        ].map(c => (
          <div key={c.label} className='rounded-2xl p-5 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className='text-xs font-bold uppercase tracking-widest mb-1' style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className='text-xl font-black' style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de alocação total */}
      {renda > 0 && (
        <div className='rounded-2xl p-5 border mb-6' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex justify-between items-center mb-3'>
            <p className='text-sm font-bold' style={{ color: 'var(--text-main)' }}>Alocação da Renda</p>
            <p className={`text-sm font-bold ${statusRestante}`}>{statusMsg}</p>
          </div>
          <div className='h-4 rounded-full overflow-hidden' style={{ background: 'var(--bg-input)' }}>
            <div className='h-full rounded-full transition-all duration-500'
              style={{ width: `${Math.min(100, (totalAlocado / renda) * 100)}%`, background: restante < 0 ? '#ef4444' : restante === 0 ? '#22c55e' : '#f59e0b' }} />
          </div>
          <p className='text-xs mt-2 text-right' style={{ color: 'var(--text-muted)' }}>
            {Math.min(100, ((totalAlocado / renda) * 100)).toFixed(0)}% alocado
          </p>
        </div>
      )}

      {/* Formulário inline */}
      {showForm && (
        <div className='rounded-2xl p-5 border mb-6' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className='font-bold mb-4' style={{ color: 'var(--text-main)' }}>Novo Envelope</p>
          <div className='flex flex-wrap gap-3'>
            <select value={catSel} onChange={e => setCatSel(e.target.value)} className='flex-1 min-w-[160px] rounded-xl p-3 border outline-none text-sm' style={inputStyle}>
              <option value=''>Selecione a categoria...</option>
              {catsDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input type='number' step='0.01' value={alocado} onChange={e => setAlocado(e.target.value)}
              placeholder='Valor (R$)' className='flex-1 min-w-[120px] rounded-xl p-3 border outline-none text-sm' style={inputStyle} />
            <button onClick={salvar} disabled={loading}
              className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-400 transition disabled:opacity-60'>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className='px-4 py-3 rounded-xl border text-sm' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de envelopes */}
      <div className='space-y-3'>
        {envelopes.map(e => {
          const pct = e.alocado > 0 ? Math.min(100, (e.gasto / e.alocado) * 100) : 0
          const cor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e'
          const sobra = e.alocado - e.gasto
          return (
            <div key={e.id} className='rounded-2xl p-5 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-3 h-3 rounded-full' style={{ background: e.cor || '#22c55e' }} />
                  <span className='font-bold' style={{ color: 'var(--text-main)' }}>{e.categoria_nome}</span>
                  {pct >= 100 && <span className='text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold'>ESGOTADO</span>}
                </div>
                <button onClick={() => excluir(e.id)} className='text-xs text-red-400 hover:text-red-300'>Remover</button>
              </div>
              <div className='h-2.5 rounded-full overflow-hidden mb-2' style={{ background: 'var(--bg-input)' }}>
                <div className='h-full rounded-full transition-all duration-500' style={{ width: `${pct}%`, background: cor }} />
              </div>
              <div className='flex justify-between text-xs' style={{ color: 'var(--text-muted)' }}>
                <span>Gasto: <span className='font-bold' style={{ color: cor }}>{fmt(e.gasto)}</span></span>
                <span className='font-bold' style={{ color: cor }}>{pct.toFixed(0)}%</span>
                <span>{sobra >= 0
                  ? <>Disponível: <span className='font-bold text-green-500'>{fmt(sobra)}</span></>
                  : <>Excedido: <span className='font-bold text-red-400'>{fmt(Math.abs(sobra))}</span></>
                }</span>
                <span>Envelope: <span className='font-bold' style={{ color: 'var(--text-main)' }}>{fmt(e.alocado)}</span></span>
              </div>
            </div>
          )
        })}
      </div>

      {envelopes.length === 0 && !showForm && (
        <div className='rounded-2xl p-16 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='text-5xl mb-4'>✉️</div>
          <h3 className='text-xl font-bold mb-2' style={{ color: 'var(--text-main)' }}>Nenhum envelope criado</h3>
          <p className='mb-6 text-sm' style={{ color: 'var(--text-muted)' }}>
            No método de orçamento base-zero, você distribui 100% da renda em envelopes por categoria antes de gastar.
          </p>
          <button onClick={() => setShowForm(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            Criar Primeiro Envelope
          </button>
        </div>
      )}
    </>
  )
}
