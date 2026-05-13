import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'

export default function Planejamento() {
  const [planos, setPlanos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [categoriaId, setCategoriaId] = useState('')
  const [valorPlanejado, setValorPlanejado] = useState('')
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const carregar = () => {
    api.get('/planejamento').then(r => setPlanos(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }
  useEffect(() => { carregar() }, [])

  const adicionar = async () => {
    if (!categoriaId || !valorPlanejado) return
    setLoading(true)
    try {
      await api.post('/planejamento', { categoria_id: Number(categoriaId), valor_planejado: Number(valorPlanejado.replace(',', '.')), mes, ano })
      setCategoriaId(''); setValorPlanejado(''); setModalOpen(false); carregar()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    try { await api.delete(`/planejamento/${id}`); carregar() } catch (e) { alert('Erro ao excluir.') }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPlanejado = planos.reduce((s, p) => s + Number(p.valor_planejado), 0)
  const totalGasto = planos.reduce((s, p) => s + Number(p.valor_gasto || 0), 0)
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Planejamento</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Orçamento mensal — {String(mes).padStart(2, '0')}/{ano}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Novo Planejamento</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {[{ l: 'Orçamento Total', v: fmt(totalPlanejado), c: 'text-blue-500' }, { l: 'Total Gasto', v: fmt(totalGasto), c: 'text-red-500' }, { l: 'Disponível', v: fmt(totalPlanejado - totalGasto), c: totalPlanejado - totalGasto >= 0 ? 'text-green-500' : 'text-red-500' }].map((item, i) => (
          <div key={i} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{item.l}</p>
            <h2 className={`text-3xl font-bold mt-2 ${item.c}`}>{item.v}</h2>
          </div>
        ))}
      </div>

      <div className='space-y-4'>
        {planos.map((p) => {
          const pct = p.valor_planejado > 0 ? Math.min(100, Math.round((p.valor_gasto / p.valor_planejado) * 100)) : 0
          const over = pct >= 100
          return (
            <div key={p.id} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <div className='w-4 h-4 rounded-full' style={{ backgroundColor: p.cor || '#22c55e' }} />
                  <h2 className='text-lg font-bold' style={{ color: 'var(--text-main)' }}>{p.categoria_nome || 'Sem categoria'}</h2>
                </div>
                <div className='flex items-center gap-4'>
                  <span className={`font-bold ${over ? 'text-red-500' : 'text-green-500'}`}>{pct}%</span>
                  <button onClick={() => excluir(p.id)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
                </div>
              </div>
              <div className='h-4 rounded-full overflow-hidden mb-3' style={{ background: 'var(--bg-input)' }}>
                <div className={`h-full transition-all duration-700 rounded-full ${over ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className='flex justify-between text-sm'>
                <span style={{ color: 'var(--text-muted)' }}>Gasto: <span className='font-semibold' style={{ color: 'var(--text-main)' }}>{fmt(p.valor_gasto)}</span></span>
                <span style={{ color: 'var(--text-muted)' }}>Planejado: <span className='font-semibold' style={{ color: 'var(--text-main)' }}>{fmt(p.valor_planejado)}</span></span>
              </div>
            </div>
          )
        })}
      </div>

      {planos.length === 0 && (
        <div className='rounded-2xl p-12 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-lg'>Nenhum planejamento para este mês</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title='Novo Planejamento'>
        <div className='space-y-4'>
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
            <option value=''>Selecione a categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input value={valorPlanejado} onChange={e => setValorPlanejado(e.target.value)} placeholder='Valor planejado' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <p style={{ color: 'var(--text-muted)' }} className='text-sm'>Mês de referência: {String(mes).padStart(2, '0')}/{ano}</p>
          <button onClick={adicionar} disabled={loading} className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Criar Planejamento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
