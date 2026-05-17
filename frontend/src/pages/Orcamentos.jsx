import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const anos = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)

export default function Orcamentos() {
  const toast = useToast()
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [orcamentos, setOrcamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [catSel, setCatSel] = useState('')
  const [limite, setLimite] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(null)

  const carregar = () => {
    api.get(`/orcamentos?mes=${mes}&ano=${ano}`).then(r => setOrcamentos(r.data)).catch(() => {})
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }
  useEffect(() => { carregar() }, [mes, ano])

  const salvar = async () => {
    if (!catSel || !limite || Number(limite) <= 0) return toast('Selecione uma categoria e informe o limite.', 'warning')
    setLoading(true)
    try {
      await api.post('/orcamentos', { categoria_id: Number(catSel), limite: Number(limite), mes, ano })
      toast('Orçamento salvo!', 'success')
      setModalOpen(false); setCatSel(''); setLimite('')
      carregar()
    } catch { toast('Erro ao salvar orçamento.', 'error') }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    setConfirmarExclusao(null)
    try { await api.delete(`/orcamentos/${id}`); toast('Removido.', 'success'); carregar() }
    catch { toast('Erro ao remover.', 'error') }
  }

  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  const totalLimite = orcamentos.reduce((s, o) => s + o.limite, 0)
  const totalGasto  = orcamentos.reduce((s, o) => s + o.gasto,  0)

  const categoriasDisponiveis = categorias.filter(c =>
    !orcamentos.some(o => o.categoria_id === c.id) && c.user_id !== null
  )

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-4xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>Orçamentos</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1'>Defina limites de gasto por categoria</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className='rounded-xl px-4 py-2.5 border text-sm outline-none' style={inputStyle}>
            {mesesNomes.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className='rounded-xl px-4 py-2.5 border text-sm outline-none' style={inputStyle}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setModalOpen(true)}
            className='bg-green-500 text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-green-400 transition text-sm'>
            + Novo Orçamento
          </button>
        </div>
      </div>

      {/* Resumo geral */}
      {orcamentos.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
          {[
            { label: 'Total Orçado', value: fmt(totalLimite), color: 'var(--text-main)' },
            { label: 'Total Gasto', value: fmt(totalGasto), color: totalGasto > totalLimite ? '#ef4444' : '#22c55e' },
            { label: 'Saldo Disponível', value: fmt(totalLimite - totalGasto), color: (totalLimite - totalGasto) >= 0 ? '#22c55e' : '#ef4444' },
          ].map(c => (
            <div key={c.label} className='rounded-2xl p-5 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <p className='text-xs font-bold uppercase tracking-widest mb-1' style={{ color: 'var(--text-muted)' }}>{c.label}</p>
              <p className='text-2xl font-black' style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cards de orçamento */}
      <div className='space-y-4'>
        {orcamentos.map(o => {
          const pct = Math.min(100, (o.gasto / o.limite) * 100)
          const cor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e'
          const restante = o.limite - o.gasto
          return (
            <div key={o.id} className='rounded-2xl p-6 border transition-all hover:border-green-500/20'
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-3 h-3 rounded-full' style={{ background: o.cor || '#22c55e' }} />
                  <span className='font-bold text-lg' style={{ color: 'var(--text-main)' }}>{o.categoria_nome || 'Categoria'}</span>
                  {pct >= 100 && <span className='text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold'>LIMITE ATINGIDO</span>}
                  {pct >= 80 && pct < 100 && <span className='text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold'>QUASE NO LIMITE</span>}
                </div>
                <button onClick={() => setConfirmarExclusao(o)} className='text-xs text-red-400 hover:text-red-300 transition'>Remover</button>
              </div>

              {/* Barra de progresso */}
              <div className='h-3 rounded-full overflow-hidden mb-3' style={{ background: 'var(--bg-input)' }}>
                <div className='h-full rounded-full transition-all duration-500'
                  style={{ width: `${pct}%`, background: cor }} />
              </div>

              <div className='flex justify-between text-sm'>
                <span style={{ color: 'var(--text-muted)' }}>
                  Gasto: <span className='font-bold' style={{ color: cor }}>{fmt(o.gasto)}</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {restante >= 0
                    ? <>Disponível: <span className='font-bold text-green-500'>{fmt(restante)}</span></>
                    : <>Excedido: <span className='font-bold text-red-400'>{fmt(Math.abs(restante))}</span></>
                  }
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Limite: <span className='font-bold' style={{ color: 'var(--text-main)' }}>{fmt(o.limite)}</span>
                </span>
              </div>

              <div className='mt-2 flex justify-between items-center'>
                <div className='text-xs font-bold' style={{ color: cor }}>{pct.toFixed(0)}% utilizado</div>
                <button onClick={() => { setCatSel(String(o.categoria_id)); setLimite(String(o.limite)); setModalOpen(true) }}
                  className='text-xs text-blue-400 hover:text-blue-300 transition'>Editar limite</button>
              </div>
            </div>
          )
        })}
      </div>

      {orcamentos.length === 0 && (
        <div className='rounded-2xl p-8 sm:p-16 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='text-5xl mb-4'>💰</div>
          <h3 className='text-xl font-bold mb-2' style={{ color: 'var(--text-main)' }}>Nenhum orçamento para este mês</h3>
          <p style={{ color: 'var(--text-muted)' }} className='mb-6'>Defina limites por categoria e acompanhe seus gastos em tempo real.</p>
          <button onClick={() => setModalOpen(true)}
            className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            Criar Primeiro Orçamento
          </button>
        </div>
      )}

      {confirmarExclusao && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setConfirmarExclusao(null)} />
          <div className='relative border rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className='text-lg font-bold mb-2' style={{ color: 'var(--text-main)' }}>Remover orçamento?</h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
              O orçamento de "<span className='font-semibold' style={{ color: 'var(--text-main)' }}>{confirmarExclusao.categoria_nome}</span>" será removido permanentemente.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setConfirmarExclusao(null)}
                className='flex-1 border rounded-xl py-2 text-sm font-semibold transition hover:opacity-80'
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={() => excluir(confirmarExclusao.id)}
                className='flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-bold hover:bg-red-600 transition'>Remover</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setCatSel(''); setLimite('') }} title='Definir Orçamento'>
        <div className='space-y-4'>
          <div>
            <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Categoria</label>
            <select value={catSel} onChange={e => setCatSel(e.target.value)}
              className='w-full rounded-xl p-4 border outline-none' style={inputStyle}>
              <option value=''>Selecione...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Limite mensal (R$)</label>
            <input type='number' step='0.01' value={limite} onChange={e => setLimite(e.target.value)}
              placeholder='Ex: 300,00' className='w-full rounded-xl p-4 border outline-none focus:border-green-400 transition'
              style={inputStyle} />
          </div>
          <div className='flex gap-3 text-sm' style={{ color: 'var(--text-muted)' }}>
            <span>Período:</span>
            <span className='font-semibold' style={{ color: 'var(--text-main)' }}>{mesesNomes[mes - 1]} / {ano}</span>
          </div>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-xl py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Orçamento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
