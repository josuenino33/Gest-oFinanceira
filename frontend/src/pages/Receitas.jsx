import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

export default function Receitas() {
  const [lista, setLista] = useState([])
  const [categorias, setCategorias] = useState([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const carregar = () => {
    api.get('/receitas').then(r => setLista(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  const adicionar = async () => {
    if (!descricao || !valor) return
    setLoading(true)
    try {
      await api.post('/receitas', {
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
    if (!confirm('Excluir esta receita?')) return
    await api.delete(`/receitas/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const total = lista.reduce((s, r) => s + Number(r.valor), 0)

  return (
    <Layout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Receitas</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Cadastre e acompanhe suas entradas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='w-full sm:w-auto bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Nova Receita
        </button>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Total de Receitas</p>
          <h2 className='text-xl md:text-3xl font-bold text-green-400 mt-1 md:mt-2'>{fmt(total)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Quantidade</p>
          <h2 className='text-xl md:text-3xl font-bold mt-1 md:mt-2'>{lista.length}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 col-span-2 md:col-span-1'>
          <p className='text-gray-400 text-xs md:text-sm'>Média por Receita</p>
          <h2 className='text-xl md:text-3xl font-bold text-blue-400 mt-1 md:mt-2'>{lista.length > 0 ? fmt(total / lista.length) : 'R$ 0,00'}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-x-auto'>
        <table className='w-full text-left min-w-[500px]'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Descrição</th>
              <th className='p-4'>Categoria</th>
              <th className='p-4'>Valor</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((item) => (
              <tr key={item.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{item.descricao}</td>
                <td className='p-4 text-gray-400'>{item.categoria_nome || '—'}</td>
                <td className='p-4 text-green-400 font-bold'>{fmt(item.valor)}</td>
                <td className='p-4'>
                  <button onClick={() => excluir(item.id)} className='text-red-400 hover:text-red-300 transition'>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma receita cadastrada</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title='Nova Receita'>
        <div className='space-y-4'>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor (ex: 1500.00)'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={adicionar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Adicionar Receita'}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
