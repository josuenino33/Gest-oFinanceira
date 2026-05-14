import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

export default function Desafios() {
  const toast = useToast()
  const [lista, setLista] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAporte, setModalAporte] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [metaValor, setMetaValor] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [aporte, setAporte] = useState('')
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  const carregar = () => {
    api.get('/desafios').then(r => setLista(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!titulo.trim() || !metaValor || !dataFim) return toast('Preencha título, meta e data limite.', 'warning')
    if (Number(metaValor) <= 0) return toast('A meta deve ser maior que zero.', 'warning')
    setLoading(true)
    try {
      await api.post('/desafios', {
        titulo, descricao,
        meta_valor: Number(metaValor),
        data_inicio: now.toISOString().slice(0, 10),
        data_fim: dataFim
      })
      toast('Desafio criado!', 'success')
      fecharModal(); carregar()
    } catch { toast('Erro ao criar desafio.', 'error') }
    finally { setLoading(false) }
  }

  const registrarAporte = async () => {
    if (!modalAporte) return
    const novoValor = (modalAporte.valor_atual || 0) + Number(aporte)
    setLoading(true)
    try {
      const res = await api.patch(`/desafios/${modalAporte.id}`, { valor_atual: novoValor })
      if (res.data.concluido) toast('Parabéns! Desafio concluído!', 'success')
      else toast('Aporte registrado!', 'success')
      setModalAporte(null); setAporte(''); carregar()
    } catch { toast('Erro ao registrar aporte.', 'error') }
    finally { setLoading(false) }
  }

  const excluir = async (id) => {
    try { await api.delete(`/desafios/${id}`); carregar() }
    catch { toast('Erro ao excluir.', 'error') }
  }

  const fecharModal = () => { setModalOpen(false); setTitulo(''); setDescricao(''); setMetaValor(''); setDataFim('') }

  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const diasRestantes = (dataFim) => {
    const diff = new Date(dataFim + 'T23:59:59') - now
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return dias
  }

  const ativos    = lista.filter(d => !d.concluido)
  const concluidos = lista.filter(d => d.concluido)

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-4xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>Desafios</h1>
          <p className='mt-1 text-sm' style={{ color: 'var(--text-muted)' }}>Crie metas de economia com prazo e acompanhe o progresso</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className='bg-green-500 text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-green-400 transition text-sm'>
          + Novo Desafio
        </button>
      </div>

      {/* Desafios ativos */}
      {ativos.length > 0 && (
        <div className='mb-8'>
          <p className='text-xs font-black uppercase tracking-widest mb-4' style={{ color: 'var(--text-muted)' }}>Em andamento</p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {ativos.map(d => {
              const pct = Math.min(100, (d.valor_atual / d.meta_valor) * 100)
              const dias = diasRestantes(d.data_fim)
              const corPrazo = dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : '#22c55e'
              return (
                <div key={d.id} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className='flex justify-between items-start mb-4'>
                    <div>
                      <h3 className='font-black text-lg' style={{ color: 'var(--text-main)' }}>{d.titulo}</h3>
                      {d.descricao && <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{d.descricao}</p>}
                    </div>
                    <button onClick={() => excluir(d.id)} className='text-xs text-red-400 hover:text-red-300'>Excluir</button>
                  </div>

                  <div className='flex justify-between text-sm mb-2'>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <span className='font-bold' style={{ color: '#22c55e' }}>{fmt(d.valor_atual)}</span> / {fmt(d.meta_valor)}
                    </span>
                    <span className='font-bold' style={{ color: '#22c55e' }}>{pct.toFixed(0)}%</span>
                  </div>

                  <div className='h-3 rounded-full overflow-hidden mb-4' style={{ background: 'var(--bg-input)' }}>
                    <div className='h-full rounded-full transition-all duration-700 bg-green-500' style={{ width: `${pct}%` }} />
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-xs font-bold' style={{ color: corPrazo }}>
                      {dias < 0 ? `Vencido há ${Math.abs(dias)} dias` : dias === 0 ? 'Vence hoje!' : `${dias} dias restantes`}
                    </span>
                    <button onClick={() => { setModalAporte(d); setAporte('') }}
                      className='bg-green-500 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-400 transition'>
                      + Registrar Aporte
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Desafios concluídos */}
      {concluidos.length > 0 && (
        <div>
          <p className='text-xs font-black uppercase tracking-widest mb-4' style={{ color: 'var(--text-muted)' }}>Concluídos</p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {concluidos.map(d => (
              <div key={d.id} className='rounded-2xl p-5 border opacity-70' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className='flex justify-between items-center'>
                  <div className='flex items-center gap-3'>
                    <span className='text-2xl'>🏆</span>
                    <div>
                      <p className='font-bold' style={{ color: 'var(--text-main)' }}>{d.titulo}</p>
                      <p className='text-xs' style={{ color: '#22c55e' }}>{fmt(d.meta_valor)} — Concluído!</p>
                    </div>
                  </div>
                  <button onClick={() => excluir(d.id)} className='text-xs text-red-400 hover:text-red-300'>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lista.length === 0 && (
        <div className='rounded-2xl p-16 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='text-5xl mb-4'>🎯</div>
          <h3 className='text-xl font-bold mb-2' style={{ color: 'var(--text-main)' }}>Nenhum desafio criado</h3>
          <p className='mb-6 text-sm' style={{ color: 'var(--text-muted)' }}>Crie um desafio de economia com prazo e veja seu progresso crescer!</p>
          <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            Criar Primeiro Desafio
          </button>
        </div>
      )}

      {/* Modal novo desafio */}
      <Modal isOpen={modalOpen} onClose={fecharModal} title='Novo Desafio'>
        <div className='space-y-4'>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder='Ex: Reserva de emergência, Viagem...'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição (opcional)'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <div>
            <label className='text-xs mb-2 block' style={{ color: 'var(--text-muted)' }}>Meta (R$)</label>
            <input type='number' step='0.01' value={metaValor} onChange={e => setMetaValor(e.target.value)} placeholder='Ex: 1000'
              className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          </div>
          <div>
            <label className='text-xs mb-2 block' style={{ color: 'var(--text-muted)' }}>Data limite</label>
            <input type='date' value={dataFim} onChange={e => setDataFim(e.target.value)}
              className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          </div>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-xl py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Criar Desafio'}
          </button>
        </div>
      </Modal>

      {/* Modal aporte */}
      <Modal isOpen={!!modalAporte} onClose={() => { setModalAporte(null); setAporte('') }} title={`Aporte — ${modalAporte?.titulo || ''}`}>
        <div className='space-y-4'>
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
            Progresso atual: <span className='font-bold' style={{ color: 'var(--text-main)' }}>{fmt(modalAporte?.valor_atual || 0)}</span> de <span className='font-bold'>{fmt(modalAporte?.meta_valor || 0)}</span>
          </p>
          <div>
            <label className='text-xs mb-2 block' style={{ color: 'var(--text-muted)' }}>Valor do aporte (R$)</label>
            <input type='number' step='0.01' value={aporte} onChange={e => setAporte(e.target.value)} placeholder='Ex: 100'
              className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          </div>
          <button onClick={registrarAporte} disabled={loading || !aporte || Number(aporte) <= 0}
            className='w-full bg-green-500 text-black rounded-xl py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Registrar Aporte'}
          </button>
        </div>
      </Modal>
    </>
  )
}
