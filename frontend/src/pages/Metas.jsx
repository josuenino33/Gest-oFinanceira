import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

export default function Metas() {
  const toast = useToast()
  const [metas, setMetas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorAlvo, setValorAlvo] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [loading, setLoading] = useState(false)
  const [metaEditando, setMetaEditando] = useState(null)
  const [calcValor, setCalcValor] = useState('')
  const [calcMeses, setCalcMeses] = useState('12')
  const [confirmarExclusao, setConfirmarExclusao] = useState(null)

  const carregar = () => { api.get('/metas').then(r => setMetas(r.data)).catch(console.error) }
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!titulo || !valorAlvo) return
    setLoading(true)
    try {
      const payload = { titulo, descricao, valor_alvo: Number(String(valorAlvo).replace(',', '.')), valor_atual: Number(String(valorAtual || '0').replace(',', '.')) }
      if (metaEditando) await api.put(`/metas/${metaEditando.id}`, payload)
      else await api.post('/metas', payload)
      fecharModal(); carregar()
    } catch (e) { console.error(e); toast('Erro ao salvar meta.', 'error') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setMetaEditando(null); setTitulo(''); setDescricao(''); setValorAlvo(''); setValorAtual('') }
  const abrirModalParaEditar = (m) => { setMetaEditando(m); setTitulo(m.titulo); setDescricao(m.descricao); setValorAlvo(m.valor_alvo); setValorAtual(m.valor_atual); setModalOpen(true) }
  const excluir = async (id) => {
    setConfirmarExclusao(null)
    try { await api.delete(`/metas/${id}`); carregar() } catch (e) { toast('Erro ao excluir.', 'error') }
  }
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Metas</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Acompanhe o progresso de cada objetivo</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Nova Meta</button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {metas.map((meta) => (
          <div key={meta.id} className='rounded-2xl p-6 border hover:border-green-500/30 transition-all' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='flex items-start justify-between mb-4'>
              <div>
                <h2 className='text-xl font-bold' style={{ color: 'var(--text-main)' }}>{meta.titulo}</h2>
                <p style={{ color: 'var(--text-muted)' }} className='text-sm mt-1'>{meta.descricao}</p>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-green-500 font-bold text-2xl'>{meta.progresso}%</span>
                <div className='flex gap-2 flex-col sm:flex-row'>
                  <button onClick={() => abrirModalParaEditar(meta)} className='text-blue-500 hover:text-blue-400 text-sm'>Editar</button>
                  <button onClick={() => setConfirmarExclusao(meta)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
                </div>
              </div>
            </div>
            <div className='h-4 rounded-full overflow-hidden mb-4' style={{ background: 'var(--bg-input)' }}>
              <div className='h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-700 rounded-full' style={{ width: `${meta.progresso}%` }} />
            </div>
            <div className='flex justify-between text-sm'>
              <span style={{ color: 'var(--text-muted)' }}>Atual: <span className='font-semibold' style={{ color: 'var(--text-main)' }}>{fmt(meta.valor_atual || 0)}</span></span>
              <span style={{ color: 'var(--text-muted)' }}>Meta: <span className='font-semibold' style={{ color: 'var(--text-main)' }}>{fmt(meta.valor_alvo || 0)}</span></span>
            </div>
          </div>
        ))}
      </div>

      {metas.length === 0 && (
        <div className='rounded-2xl p-8 sm:p-12 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-lg'>Nenhuma meta cadastrada</p>
        </div>
      )}

      {/* Simulador */}
      <div className='mt-8 sm:mt-12 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-3xl p-4 sm:p-8 border border-green-500/20'>
        <div className='max-w-3xl'>
          <h2 className='text-xl sm:text-3xl font-bold mb-2' style={{ color: 'var(--text-main)' }}>🚀 Simulador de Objetivos</h2>
          <p style={{ color: 'var(--text-muted)' }} className='mb-6 sm:mb-8'>Descubra quanto você precisa poupar para realizar seus sonhos.</p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8'>
            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-main)' }}>Quanto você quer juntar?</label>
                <div className='relative'>
                  <span className='absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold'>R$</span>
                  <input type='number' value={calcValor} onChange={e => setCalcValor(e.target.value)}
                    className='w-full rounded-xl p-4 pl-12 border outline-none focus:border-green-400 transition' style={inputStyle} placeholder='0,00' />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-main)' }}>Em quantos meses?</label>
                <input type='range' min='1' max='60' value={calcMeses} onChange={e => setCalcMeses(e.target.value)}
                  className='w-full mb-2' />
                <div className='flex justify-between text-xs'>
                  <span style={{ color: 'var(--text-muted)' }}>1 mês</span>
                  <span className='text-green-500 font-bold text-lg'>{calcMeses} meses</span>
                  <span style={{ color: 'var(--text-muted)' }}>5 anos</span>
                </div>
              </div>
            </div>
            <div className='rounded-2xl p-6 border flex flex-col justify-center items-center text-center shadow-xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)' }} className='text-sm uppercase tracking-wider mb-2'>Você precisará poupar</p>
              <h3 className='text-3xl sm:text-4xl md:text-5xl font-black text-green-500 mb-2'>{fmt(Number(calcValor || 0) / (Number(calcMeses) || 1))}</h3>
              <p style={{ color: 'var(--text-muted)' }}>por mês</p>
              <div className='mt-6 pt-6 border-t w-full' style={{ borderColor: 'var(--border-color)' }}>
                <p className='text-xs italic' style={{ color: 'var(--text-muted)' }}>"O segredo para chegar em qualquer lugar é começar."</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmarExclusao && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setConfirmarExclusao(null)} />
          <div className='relative border rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className='text-lg font-bold mb-2' style={{ color: 'var(--text-main)' }}>Excluir meta?</h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
              "<span className='font-semibold' style={{ color: 'var(--text-main)' }}>{confirmarExclusao.titulo}</span>" será excluída permanentemente.
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

      <Modal isOpen={modalOpen} onClose={fecharModal} title={metaEditando ? 'Editar Meta' : 'Nova Meta'}>
        <div className='space-y-4'>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder='Título da meta' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição (opcional)' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={valorAlvo} onChange={e => setValorAlvo(e.target.value)} placeholder='Valor alvo' type='number' step='0.01' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder='Valor atual' type='number' step='0.01' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <button onClick={salvar} disabled={loading} className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Meta'}
          </button>
        </div>
      </Modal>
    </>
  )
}
