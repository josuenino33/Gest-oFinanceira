import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

export default function Contas() {
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const carregar = () => {
    api.get('/contas').then(r => setContas(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  const adicionar = async () => {
    if (!descricao || !valor) return
    setLoading(true)
    try {
      await api.post('/contas', {
        descricao,
        valor: Number(valor.replace(',', '.')),
        categoria_id: categoriaId || null,
      })
      setDescricao(''); setValor(''); setCategoriaId('')
      setModalOpen(false)
      carregar()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir esta conta?')) return
    await api.delete(`/contas/${id}`)
    carregar()
  }

  const marcarPaga = async (id) => {
    await api.patch(`/contas/${id}/pagar`)
    carregar()
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPendente = contas.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = contas.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0)

  return (
    <Layout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Contas a Pagar</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Acompanhe e adicione suas despesas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='w-full sm:w-auto bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Nova Conta
        </button>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Pendentes</p>
          <h2 className='text-xl md:text-3xl font-bold text-yellow-400 mt-1 md:mt-2'>{fmt(totalPendente)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Pagas</p>
          <h2 className='text-xl md:text-3xl font-bold text-green-400 mt-1 md:mt-2'>{fmt(totalPago)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 col-span-2 md:col-span-1'>
          <p className='text-gray-400 text-xs md:text-sm'>Total Geral</p>
          <h2 className='text-xl md:text-3xl font-bold text-red-400 mt-1 md:mt-2'>{fmt(totalPendente + totalPago)}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-x-auto'>
        <table className='w-full text-left min-w-[600px]'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Descrição</th>
              <th className='p-4'>Categoria</th>
              <th className='p-4'>Valor</th>
              <th className='p-4'>Status</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{c.descricao}</td>
                <td className='p-4 text-gray-400'>{c.categoria_nome || '—'}</td>
                <td className='p-4 text-red-400 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4'>
                  {c.pago
                    ? <span className='bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm'>Paga</span>
                    : <span className='bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm'>Pendente</span>}
                </td>
                <td className='p-4 flex gap-3'>
                  {!c.pago && (
                    <button onClick={() => marcarPaga(c.id)} className='text-green-400 hover:text-green-300 transition text-sm'>Pagar</button>
                  )}
                  <button onClick={() => excluir(c.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contas.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma conta cadastrada</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title='Nova Conta'>
        <div className='space-y-4'>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição da conta'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={adicionar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Adicionar Conta'}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
