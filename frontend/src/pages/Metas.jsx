import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Modal from '../components/Modal'

export default function Metas() {
  const [metas, setMetas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorAlvo, setValorAlvo] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [loading, setLoading] = useState(false)
  const [metaEditando, setMetaEditando] = useState(null)

  const carregar = () => {
    api.get('/metas').then(r => setMetas(r.data)).catch(console.error)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!titulo || !valorAlvo) return
    setLoading(true)
    try {
      const payload = {
        titulo, descricao,
        valor_alvo: Number(String(valorAlvo).replace(',', '.')),
        valor_atual: Number(String(valorAtual || '0').replace(',', '.')),
      }
      if (metaEditando) {
        await api.put(`/metas/${metaEditando.id}`, payload)
      } else {
        await api.post('/metas', payload)
      }
      fecharModal()
      carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar meta') }
    finally { setLoading(false) }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setMetaEditando(null)
    setTitulo('')
    setDescricao('')
    setValorAlvo('')
    setValorAtual('')
  }

  const abrirModalParaEditar = (meta) => {
    setMetaEditando(meta)
    setTitulo(meta.titulo)
    setDescricao(meta.descricao)
    setValorAlvo(meta.valor_alvo)
    setValorAtual(meta.valor_atual)
    setModalOpen(true)
  }

  const excluir = async (id) => {
    try {
      await api.delete(`/metas/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir meta.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <Layout>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-4xl font-bold'>Metas</h1>
          <p className='text-gray-400 mt-2'>Acompanhe o progresso de cada objetivo</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
          + Nova Meta
        </button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {metas.map((meta) => (
          <div key={meta.id} className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-300'>
            <div className='flex items-start justify-between mb-4'>
              <div>
                <h2 className='text-xl font-bold'>{meta.titulo}</h2>
                <p className='text-gray-400 text-sm mt-1'>{meta.descricao}</p>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-green-400 font-bold text-2xl'>{meta.progresso}%</span>
                <div className='flex gap-2 flex-col sm:flex-row'>
                  <button onClick={() => abrirModalParaEditar(meta)} className='text-blue-400 hover:text-blue-300 text-sm transition'>Editar</button>
                  <button onClick={() => excluir(meta.id)} className='text-red-400 hover:text-red-300 text-sm transition'>Excluir</button>
                </div>
              </div>
            </div>

            <div className='h-4 rounded-full bg-[#132238] overflow-hidden mb-4'>
              <div
                className='h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-700 rounded-full'
                style={{ width: `${meta.progresso}%` }}
              />
            </div>

            <div className='flex justify-between text-sm'>
              <span className='text-gray-400'>Atual: <span className='text-white font-semibold'>{fmt(meta.valor_atual || 0)}</span></span>
              <span className='text-gray-400'>Meta: <span className='text-white font-semibold'>{fmt(meta.valor_alvo || 0)}</span></span>
            </div>
          </div>
        ))}
      </div>

      {metas.length === 0 && (
        <div className='bg-[#0d1a2d] rounded-2xl p-12 border border-gray-800 text-center'>
          <p className='text-gray-400 text-lg'>Nenhuma meta cadastrada</p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={fecharModal} title={metaEditando ? 'Editar Meta' : 'Nova Meta'}>
        <div className='space-y-4'>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder='Título da meta'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição (opcional)'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valorAlvo} onChange={e => setValorAlvo(e.target.value)} placeholder='Valor alvo (ex: 10000.00)' type='number' step='0.01'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder='Valor atual (ex: 2500.00)' type='number' step='0.01'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Meta'}
          </button>
        </div>
      </Modal>
    </Layout>
  )
}
