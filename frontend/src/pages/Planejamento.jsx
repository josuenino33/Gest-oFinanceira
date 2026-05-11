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
      await api.post('/planejamento', {
        categoria_id: Number(categoriaId),
        valor_planejado: Number(valorPlanejado.replace(',', '.')),
        mes, ano,
      })
      setCategoriaId(''); setValorPlanejado('')
      setModalOpen(false)
      carregar()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este planejamento?')) return
    await api.delete(`/planejamento/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPlanejado = planos.reduce((s, p) => s + Number(p.valor_planejado), 0)
  const totalGasto = planos.reduce((s, p) => s + Number(p.valor_gasto || 0), 0)

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold'>Planejamento</h1>
          <p className='text-gray-400 mt-2'>Orçamento mensal por categoria — {String(mes).padStart(2, '0')}/{ano}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Novo Planejamento
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Orçamento Total</p>
          <h2 className='text-3xl font-bold text-blue-400 mt-2'>{fmt(totalPlanejado)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Total Gasto</p>
          <h2 className='text-3xl font-bold text-red-400 mt-2'>{fmt(totalGasto)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Disponível</p>
          <h2 className={`text-3xl font-bold mt-2 ${totalPlanejado - totalGasto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(totalPlanejado - totalGasto)}
          </h2>
        </div>
      </div>

      <div className='space-y-4'>
        {planos.map((p) => {
          const pct = p.valor_planejado > 0 ? Math.min(100, Math.round((p.valor_gasto / p.valor_planejado) * 100)) : 0
          const over = pct >= 100

          return (
            <div key={p.id} className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <div className='w-4 h-4 rounded-full' style={{ backgroundColor: p.cor || '#22c55e' }} />
                  <h2 className='text-lg font-bold'>{p.categoria_nome || 'Sem categoria'}</h2>
                </div>
                <div className='flex items-center gap-4'>
                  <span className={`font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>{pct}%</span>
                  <button onClick={() => excluir(p.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                </div>
              </div>

              <div className='h-4 rounded-full bg-[#132238] overflow-hidden mb-3'>
                <div className={`h-full transition-all duration-700 rounded-full ${over ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'}`}
                  style={{ width: `${pct}%` }} />
              </div>

              <div className='flex justify-between text-sm'>
                <span className='text-gray-400'>Gasto: <span className='text-white font-semibold'>{fmt(p.valor_gasto)}</span></span>
                <span className='text-gray-400'>Planejado: <span className='text-white font-semibold'>{fmt(p.valor_planejado)}</span></span>
              </div>
            </div>
          )
        })}
      </div>

      {planos.length === 0 && (
        <div className='bg-[#0d1a2d] rounded-2xl p-12 border border-gray-800 text-center'>
          <p className='text-gray-400 text-lg'>Nenhum planejamento para este mês</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title='Novo Planejamento'>
        <div className='space-y-4'>
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Selecione a categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input value={valorPlanejado} onChange={e => setValorPlanejado(e.target.value)} placeholder='Valor planejado (ex: 1500.00)'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <p className='text-gray-500 text-sm'>Mês de referência: {String(mes).padStart(2, '0')}/{ano}</p>
          <button onClick={adicionar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Criar Planejamento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
