import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

export default function ComprasCartao() {
  const [compras, setCompras] = useState([])
  const [cartoes, setCartoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [cartaoId, setCartaoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState('1')
  const [loading, setLoading] = useState(false)
  const [compraEditando, setCompraEditando] = useState(null)

  const carregar = () => {
    api.get('/compras-cartao').then(r => setCompras(r.data)).catch(console.error)
    api.get('/cartoes').then(r => setCartoes(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!cartaoId || !descricao.trim() || !valor) {
      alert('Selecione o cartão e informe a descrição e o valor da compra.')
      return
    }
    const valorNumerico = Number(String(valor).replace(',', '.'))
    const parcelasNumerico = Number(parcelas)
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0 || !Number.isInteger(parcelasNumerico) || parcelasNumerico <= 0) {
      alert('Informe valor e número de parcelas válidos.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        cartao_id: Number(cartaoId),
        descricao,
        valor: valorNumerico,
        parcelas: parcelasNumerico,
        pago: compraEditando ? compraEditando.pago : 0
      }
      if (compraEditando) {
        await api.put(`/compras-cartao/${compraEditando.id}`, payload)
      } else {
        await api.post('/compras-cartao', payload)
      }
      fecharModal()
      carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar compra.') }
    finally { setLoading(false) }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setCompraEditando(null)
    setCartaoId('')
    setDescricao('')
    setValor('')
    setParcelas('1')
  }

  const abrirModalParaEditar = (compra) => {
    setCompraEditando(compra)
    setCartaoId(compra.cartao_id)
    setDescricao(compra.descricao)
    setValor(compra.valor)
    setParcelas(compra.parcelas)
    setModalOpen(true)
  }

  const excluir = async (id) => {
    try {
      await api.delete(`/compras-cartao/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir compra.')
    }
  }

  const marcarPaga = async (id) => {
    try {
      await api.patch(`/compras-cartao/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como paga.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const total = compras.reduce((s, c) => s + Number(c.valor), 0)

  return (
    <Layout>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold'>Compras no Cartão</h1>
          <p className='text-gray-400 mt-2'>Acompanhe suas compras parceladas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Nova Compra
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Total em Compras</p>
          <h2 className='text-3xl font-bold text-green-400 mt-2'>{fmt(total)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Compras Ativas</p>
          <h2 className='text-3xl font-bold mt-2'>{compras.length}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-hidden'>
        <table className='w-full text-left'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Compra</th>
              <th className='p-4'>Cartão</th>
              <th className='p-4'>Parcelas</th>
              <th className='p-4'>Valor Total</th>
              <th className='p-4'>Parcela</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{c.descricao}</td>
                <td className='p-4 text-gray-400'>{c.cartao_nome} ({c.bandeira})</td>
                <td className='p-4'>
                  <span className='bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm'>
                    {c.parcela_atual}/{c.parcelas}x
                  </span>
                </td>
                <td className='p-4 text-green-400 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4 text-gray-300'>{fmt(c.valor / c.parcelas)}/mês</td>
                <td className='p-4'>
                  <div className='flex gap-2 flex-col sm:flex-row'>
                    {!c.pago && (
                      <button onClick={() => marcarPaga(c.id)} className='text-green-400 hover:text-green-300 transition text-sm'>Pagar</button>
                    )}
                    <button onClick={() => abrirModalParaEditar(c)} className='text-blue-400 hover:text-blue-300 transition text-sm'>Editar</button>
                    <button onClick={() => excluir(c.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {compras.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma compra cadastrada</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={compraEditando ? 'Editar Compra' : 'Nova Compra no Cartão'}>
        <div className='space-y-4'>
          <select value={cartaoId} onChange={e => setCartaoId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Selecione o cartão</option>
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.bandeira})</option>)}
          </select>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição da compra'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor total' type='number' step='0.01'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={parcelas} onChange={e => setParcelas(e.target.value)} placeholder='Número de parcelas' type='number' min='1'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Compra'}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
