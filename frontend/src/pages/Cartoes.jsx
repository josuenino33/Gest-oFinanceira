import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

export default function Cartoes() {
  const [cartoes, setCartoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [bandeira, setBandeira] = useState('')
  const [limite, setLimite] = useState('')
  const [loading, setLoading] = useState(false)
  const [cartaoEditando, setCartaoEditando] = useState(null)

  const carregar = () => {
    api.get('/cartoes').then(r => setCartoes(r.data)).catch(console.error)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!nome.trim() || !bandeira || !limite) {
      alert('Informe o nome, a bandeira e o limite do cartão.')
      return
    }
    const limiteNumerico = Number(String(limite).replace(',', '.'))
    if (!Number.isFinite(limiteNumerico) || limiteNumerico <= 0) {
      alert('Informe um limite válido para o cartão.')
      return
    }
    setLoading(true)
    try {
      const payload = { nome, bandeira, limite: limiteNumerico }
      if (cartaoEditando) {
        await api.put(`/cartoes/${cartaoEditando.id}`, payload)
      } else {
        await api.post('/cartoes', payload)
      }
      fecharModal()
      carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar cartão') }
    finally { setLoading(false) }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setCartaoEditando(null)
    setNome('')
    setBandeira('')
    setLimite('')
  }

  const abrirModalParaEditar = (cartao) => {
    setCartaoEditando(cartao)
    setNome(cartao.nome)
    setBandeira(cartao.bandeira)
    setLimite(cartao.limite)
    setModalOpen(true)
  }

  const excluir = async (id) => {
    try {
      await api.delete(`/cartoes/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir cartão.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const bandeiras = {
    'Visa': '💳',
    'Mastercard': '💳',
    'Elo': '💳',
    'Amex': '💳',
  }

  return (
    <Layout>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold'>Cartões</h1>
          <p className='text-gray-400 mt-2'>Gerencie seus cartões de crédito</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Novo Cartão
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        {cartoes.map((cartao) => (
          <div key={cartao.id} className='bg-gradient-to-br from-[#0d1a2d] to-[#132238] rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-300'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                <span className='text-3xl'>{bandeiras[cartao.bandeira] || '💳'}</span>
                <div>
                  <h2 className='text-xl font-bold'>{cartao.nome}</h2>
                  <p className='text-gray-400 text-sm'>{cartao.bandeira}</p>
                </div>
              </div>
              <div className='flex gap-2'>
                <button onClick={() => abrirModalParaEditar(cartao)} className='text-blue-400 hover:text-blue-300 text-sm transition'>Editar</button>
                <button onClick={() => excluir(cartao.id)} className='text-red-400 hover:text-red-300 text-sm transition'>Excluir</button>
              </div>
            </div>

            <div className='bg-[#0b1728] rounded-xl p-4'>
              <p className='text-gray-400 text-sm'>Disponível</p>
              <p className='text-2xl font-bold text-green-400 mt-1'>{fmt(cartao.limite - (cartao.total_gasto || 0))}</p>
            </div>

            <div className='mt-4 flex gap-2'>
              <div className='flex-1 h-2 bg-green-500/30 rounded-full'>
                <div className='h-full bg-green-500 rounded-full' style={{ width: `${Math.max(0, Math.min(100, ((cartao.limite - (cartao.total_gasto || 0)) / cartao.limite) * 100))}%` }} />
              </div>
            </div>
            <p className='text-gray-500 text-xs mt-2'>
              {Math.round(((cartao.limite - (cartao.total_gasto || 0)) / cartao.limite) * 100)}% do limite disponível
            </p>
          </div>
        ))}
      </div>

      {cartoes.length === 0 && (
        <div className='bg-[#0d1a2d] rounded-2xl p-12 border border-gray-800 text-center'>
          <p className='text-gray-400 text-lg'>Nenhum cartão cadastrado</p>
          <button onClick={() => setModalOpen(true)} className='mt-4 text-green-400 hover:text-green-300 transition'>Adicionar primeiro cartão</button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={fecharModal} title={cartaoEditando ? 'Editar Cartão' : 'Novo Cartão'}>
        <div className='space-y-4'>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder='Nome do cartão'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <select value={bandeira} onChange={e => setBandeira(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Selecione a bandeira</option>
            <option value='Visa'>Visa</option>
            <option value='Mastercard'>Mastercard</option>
            <option value='Elo'>Elo</option>
            <option value='Amex'>American Express</option>
          </select>
          <input value={limite} onChange={e => setLimite(e.target.value)} placeholder='Limite (ex: 5000.00)'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Cartão'}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
