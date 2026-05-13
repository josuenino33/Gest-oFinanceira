import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

export default function Cartoes() {
  const toast = useToast()
  const [cartoes, setCartoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [bandeira, setBandeira] = useState('')
  const [limite, setLimite] = useState('')
  const [loading, setLoading] = useState(false)
  const [cartaoEditando, setCartaoEditando] = useState(null)

  const carregar = () => { api.get('/cartoes').then(r => setCartoes(r.data)).catch(console.error) }
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!nome.trim() || !bandeira || !limite) { toast('Informe todos os campos.', 'warning'); return }
    const limiteNum = Number(String(limite).replace(',', '.'))
    if (!Number.isFinite(limiteNum) || limiteNum <= 0) { toast('Limite inválido.', 'warning'); return }
    setLoading(true)
    try {
      const payload = { nome, bandeira, limite: limiteNum }
      if (cartaoEditando) await api.put(`/cartoes/${cartaoEditando.id}`, payload)
      else await api.post('/cartoes', payload)
      fecharModal(); carregar()
    } catch (e) { console.error(e); toast('Erro ao salvar cartão.', 'error') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setCartaoEditando(null); setNome(''); setBandeira(''); setLimite('') }
  const abrirModalParaEditar = (c) => { setCartaoEditando(c); setNome(c.nome); setBandeira(c.bandeira); setLimite(c.limite); setModalOpen(true) }
  const excluir = async (id) => { try { await api.delete(`/cartoes/${id}`); carregar() } catch (e) { toast('Erro ao excluir.', 'error') } }
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Cartões</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Gerencie seus cartões de crédito</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Novo Cartão</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        {cartoes.map((cartao) => (
          <div key={cartao.id} className='rounded-2xl p-6 border hover:border-green-500/30 transition-all duration-300' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center gap-3'>
                <span className='text-3xl'>💳</span>
                <div>
                  <h2 className='text-xl font-bold' style={{ color: 'var(--text-main)' }}>{cartao.nome}</h2>
                  <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{cartao.bandeira}</p>
                </div>
              </div>
              <div className='flex gap-2'>
                <button onClick={() => abrirModalParaEditar(cartao)} className='text-blue-500 hover:text-blue-400 text-sm transition'>Editar</button>
                <button onClick={() => excluir(cartao.id)} className='text-red-500 hover:text-red-400 text-sm transition'>Excluir</button>
              </div>
            </div>
            <div className='rounded-xl p-4' style={{ background: 'var(--bg-input)' }}>
              <p style={{ color: 'var(--text-muted)' }} className='text-sm'>Disponível</p>
              <p className='text-2xl font-bold text-green-500 mt-1'>{fmt(cartao.limite - (cartao.total_gasto || 0))}</p>
            </div>
            <div className='mt-4 flex gap-2'>
              <div className='flex-1 h-2 bg-green-500/30 rounded-full'>
                <div className='h-full bg-green-500 rounded-full' style={{ width: `${Math.max(0, Math.min(100, ((cartao.limite - (cartao.total_gasto || 0)) / cartao.limite) * 100))}%` }} />
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)' }} className='text-xs mt-2'>
              {Math.round(((cartao.limite - (cartao.total_gasto || 0)) / cartao.limite) * 100)}% do limite disponível
            </p>
          </div>
        ))}
      </div>

      {cartoes.length === 0 && (
        <div className='rounded-2xl p-12 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-lg'>Nenhum cartão cadastrado</p>
          <button onClick={() => setModalOpen(true)} className='mt-4 text-green-500 hover:text-green-400 transition'>Adicionar primeiro cartão</button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={fecharModal} title={cartaoEditando ? 'Editar Cartão' : 'Novo Cartão'}>
        <div className='space-y-4'>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder='Nome do cartão'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
          <select value={bandeira} onChange={e => setBandeira(e.target.value)}
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
            <option value=''>Selecione a bandeira</option>
            <option value='Visa'>Visa</option><option value='Mastercard'>Mastercard</option>
            <option value='Elo'>Elo</option><option value='Amex'>American Express</option>
          </select>
          <input value={limite} onChange={e => setLimite(e.target.value)} placeholder='Limite (ex: 5000.00)'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Cartão'}
          </button>
        </div>
      </Modal>
    </>
  )
}
