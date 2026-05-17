import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

export default function Categorias() {
  const toast = useToast()
  const [categorias, setCategorias] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#22c55e')
  const [loading, setLoading] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(null)

  const carregar = () => { api.get('/categorias').then(r => setCategorias(r.data)).catch(console.error) }
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!nome.trim()) { toast('Informe o nome da categoria.', 'warning'); return }
    setLoading(true)
    try {
      const payload = { nome, cor }
      if (categoriaEditando) await api.put(`/categorias/${categoriaEditando.id}`, payload)
      else await api.post('/categorias', payload)
      fecharModal(); carregar()
    } catch (e) { console.error(e); toast('Erro ao salvar categoria.', 'error') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setCategoriaEditando(null); setNome(''); setCor('#22c55e') }
  const abrirModalParaEditar = (cat) => {
    if (cat.user_id === null || cat.user_id === undefined) { toast('Categorias padrão não podem ser editadas.', 'warning'); return }
    setCategoriaEditando(cat); setNome(cat.nome); setCor(cat.cor || '#22c55e'); setModalOpen(true)
  }
  const excluir = async (id) => {
    setConfirmarExclusao(null)
    try { await api.delete(`/categorias/${id}`); carregar() } catch (e) { toast('Erro ao excluir.', 'error') }
  }

  const cores = ['#22c55e', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e']
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Categorias</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Organize suas receitas e despesas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Nova Categoria</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'>
        {categorias.map((cat) => (
          <div key={cat.id} className='rounded-2xl p-6 border hover:border-green-500/30 transition-all' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white' style={{ backgroundColor: cat.cor }}>{cat.nome.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className='text-lg font-bold' style={{ color: 'var(--text-main)' }}>{cat.nome}</h2>
                  <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{cat.cor}</p>
                </div>
              </div>
              {cat.user_id ? (
                <div className='flex gap-2 flex-col sm:flex-row'>
                  <button onClick={() => abrirModalParaEditar(cat)} className='text-blue-500 hover:text-blue-400 text-sm'>Editar</button>
                  <button onClick={() => setConfirmarExclusao(cat)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
                </div>
              ) : <span className='text-xs' style={{ color: 'var(--text-muted)' }}>Padrão</span>}
            </div>
          </div>
        ))}
      </div>

      {categorias.length === 0 && (
        <div className='rounded-2xl p-6 sm:p-12 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-lg'>Nenhuma categoria cadastrada</p>
        </div>
      )}

      {confirmarExclusao && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setConfirmarExclusao(null)} />
          <div className='relative border rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className='text-lg font-bold mb-2' style={{ color: 'var(--text-main)' }}>Excluir categoria?</h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
              "<span className='font-semibold' style={{ color: 'var(--text-main)' }}>{confirmarExclusao.nome}</span>" será excluída permanentemente.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setConfirmarExclusao(null)}
                className='flex-1 border rounded-xl py-2 text-sm font-semibold transition hover:opacity-80'
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={() => excluir(confirmarExclusao.id)}
                className='flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-bold hover:bg-red-600 transition'>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={fecharModal} title={categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className='space-y-4'>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder='Nome da categoria' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <div>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mb-3'>Cor da categoria</p>
            <div className='flex flex-wrap gap-3'>
              {cores.map((c) => (
                <button key={c} onClick={() => setCor(c)}
                  className={`w-10 h-10 rounded-xl transition-all ${cor === c ? 'ring-2 ring-green-500 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className='flex items-center gap-3 rounded-xl p-4 border' style={inputStyle}>
            <div className='w-8 h-8 rounded-lg' style={{ backgroundColor: cor }} />
            <span style={{ color: 'var(--text-main)' }}>Preview: {nome || 'Categoria'}</span>
          </div>
          <button onClick={salvar} disabled={loading} className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Categoria'}
          </button>
        </div>
      </Modal>
    </>
  )
}
