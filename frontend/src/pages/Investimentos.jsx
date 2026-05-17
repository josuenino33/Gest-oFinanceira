import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

export default function Investimentos() {
  const toast = useToast()
  const [lista, setLista] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [valorInvestido, setValorInvestido] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [loading, setLoading] = useState(false)
  const [investimentoEditando, setInvestimentoEditando] = useState(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(null)

  const carregar = () => { api.get('/investimentos').then(r => setLista(r.data)).catch(console.error) }
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!titulo || !tipo || !valorInvestido || !valorAtual) return
    setLoading(true)
    try {
      const payload = { titulo, tipo, valor_investido: Number(String(valorInvestido).replace(',', '.')), valor_atual: Number(String(valorAtual).replace(',', '.')) }
      if (investimentoEditando) await api.put(`/investimentos/${investimentoEditando.id}`, payload)
      else await api.post('/investimentos', payload)
      fecharModal(); carregar()
    } catch (e) { console.error(e); toast('Erro ao salvar investimento.', 'error') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setInvestimentoEditando(null); setTitulo(''); setTipo(''); setValorInvestido(''); setValorAtual('') }
  const abrirModalParaEditar = (inv) => { setInvestimentoEditando(inv); setTitulo(inv.titulo); setTipo(inv.tipo); setValorInvestido(inv.valor_investido); setValorAtual(inv.valor_atual); setModalOpen(true) }
  const excluir = async (id) => {
    setConfirmarExclusao(null)
    try { await api.delete(`/investimentos/${id}`); carregar() } catch (e) { toast('Erro ao excluir.', 'error') }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalInvestido = lista.reduce((s, i) => s + Number(i.valor_investido), 0)
  const totalAtual = lista.reduce((s, i) => s + Number(i.valor_atual), 0)
  const rentTotal = totalInvestido > 0 ? ((totalAtual - totalInvestido) / totalInvestido * 100).toFixed(1) : 0
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-wrap justify-between items-start gap-4 mb-8'>
        <div>
          <h1 className='text-2xl sm:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Investimentos</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Acompanhe sua carteira de investimentos</p>
        </div>
        <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Novo Investimento</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8'>
        {[{ l: 'Total Investido', v: fmt(totalInvestido), c: 'text-blue-500' }, { l: 'Valor Atual', v: fmt(totalAtual), c: 'text-green-500' }, { l: 'Rentabilidade', v: `${rentTotal >= 0 ? '+' : ''}${rentTotal}%`, c: rentTotal >= 0 ? 'text-green-500' : 'text-red-500' }].map((item, i) => (
          <div key={i} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{item.l}</p>
            <h2 className={`text-3xl font-bold mt-2 ${item.c}`}>{item.v}</h2>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
        {lista.map((inv) => (
          <div key={inv.id} className='rounded-2xl p-6 border hover:border-green-500/30 transition-all' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className='flex items-start justify-between mb-4'>
              <div>
                <h2 className='text-xl font-bold' style={{ color: 'var(--text-main)' }}>{inv.titulo}</h2>
                <span className='bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-xs mt-2 inline-block'>{inv.tipo}</span>
              </div>
              <div className='flex gap-2'>
                <button onClick={() => abrirModalParaEditar(inv)} className='text-blue-500 hover:text-blue-400 text-sm'>Editar</button>
                <button onClick={() => setConfirmarExclusao(inv)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4 mt-4'>
              <div className='rounded-xl p-4' style={{ background: 'var(--bg-input)' }}>
                <p style={{ color: 'var(--text-muted)' }} className='text-xs'>Investido</p>
                <p className='font-bold mt-1' style={{ color: 'var(--text-main)' }}>{fmt(inv.valor_investido)}</p>
              </div>
              <div className='rounded-xl p-4' style={{ background: 'var(--bg-input)' }}>
                <p style={{ color: 'var(--text-muted)' }} className='text-xs'>Atual</p>
                <p className='text-green-500 font-bold mt-1'>{fmt(inv.valor_atual)}</p>
              </div>
            </div>
            <div className='mt-4 flex items-center justify-between'>
              <span style={{ color: 'var(--text-muted)' }} className='text-sm'>Rentabilidade</span>
              <span className={`font-bold ${inv.rentabilidade >= 0 ? 'text-green-500' : 'text-red-500'}`}>{inv.rentabilidade >= 0 ? '+' : ''}{inv.rentabilidade}%</span>
            </div>
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div className='rounded-2xl p-6 sm:p-12 border text-center' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-lg'>Nenhum investimento cadastrado</p>
        </div>
      )}

      {confirmarExclusao && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setConfirmarExclusao(null)} />
          <div className='relative border rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className='text-lg font-bold mb-2' style={{ color: 'var(--text-main)' }}>Excluir investimento?</h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
              "<span className='font-semibold' style={{ color: 'var(--text-main)' }}>{confirmarExclusao.titulo}</span>" será excluído permanentemente.
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

      <Modal isOpen={modalOpen} onClose={fecharModal} title={investimentoEditando ? 'Editar Investimento' : 'Novo Investimento'}>
        <div className='space-y-4'>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder='Nome do investimento' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
            <option value=''>Tipo de investimento</option>
            <option value='Renda Fixa'>Renda Fixa</option><option value='Ações'>Ações</option><option value='FII'>Fundos Imobiliários</option>
            <option value='Cripto'>Criptomoedas</option><option value='Tesouro'>Tesouro Direto</option>
          </select>
          <input value={valorInvestido} onChange={e => setValorInvestido(e.target.value)} placeholder='Valor investido' type='number' step='0.01' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder='Valor atual' type='number' step='0.01' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <button onClick={salvar} disabled={loading} className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Investimento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
