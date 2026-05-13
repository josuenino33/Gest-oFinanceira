import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Contas() {
  const toast = useToast()
  const [contasCompletas, setContasCompletas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pago, setPago] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [contaEditando, setContaEditando] = useState(null)

  const now = new Date()
  const [mesFiltro, setMesFiltro] = useState(now.getMonth())
  const [anoFiltro, setAnoFiltro] = useState(now.getFullYear())
  const [suggesting, setSuggesting] = useState(false)

  const sugerirCategoria = async () => {
    if (!descricao.trim() || categoriaId) return
    setSuggesting(true)
    try {
      const res = await api.post('/auto-categorize', { descricao })
      if (res.data.categoria_id) setCategoriaId(res.data.categoria_id)
    } catch (e) { console.error(e) }
    finally { setSuggesting(false) }
  }

  const carregar = () => {
    api.get('/contas').then(r => setContasCompletas(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  const contas = contasCompletas.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const salvar = async () => {
    if (!descricao.trim() || !valor) { toast('Informe a descrição e o valor.', 'warning'); return }
    const valorNumerico = Number(String(valor).replace(',', '.'))
    const payload = {
      descricao, valor: valorNumerico, categoria_id: categoriaId || null,
      pago: pago ? 1 : 0,
      criado_em: `${anoFiltro}-${String(mesFiltro + 1).padStart(2, '0')}-15 12:00:00`
    }
    const tempId = Date.now()
    const cat = categorias.find(c => String(c.id) === String(categoriaId))
    const itemOtimista = { ...payload, id: tempId, categoria_nome: cat ? cat.nome : '—' }

    if (!contaEditando) setContasCompletas(prev => [itemOtimista, ...prev])
    else setContasCompletas(prev => prev.map(item => item.id === contaEditando.id ? { ...item, ...payload } : item))
    fecharModal()

    setLoading(true); setError(null)
    try {
      if (contaEditando) await api.put(`/contas/${contaEditando.id}`, payload)
      else await api.post('/contas', payload)
      carregar()
    } catch (e) {
      setError(e.response?.data?.msg || 'Erro ao conectar.'); carregar()
    } finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setContaEditando(null); setDescricao(''); setValor(''); setCategoriaId(''); setPago(false) }
  const abrirModalParaEditar = (conta) => { setContaEditando(conta); setDescricao(conta.descricao); setValor(conta.valor); setCategoriaId(conta.categoria_id || ''); setPago(!!conta.pago); setModalOpen(true) }

  const excluir = async (id) => {
    const backup = [...contasCompletas]
    setContasCompletas(prev => prev.filter(item => item.id !== id))
    try { await api.delete(`/contas/${id}`) }
    catch (e) { setContasCompletas(backup); toast('Erro ao excluir.', 'error') }
  }

  const marcarPaga = async (id) => {
    const backup = [...contasCompletas]
    setContasCompletas(prev => prev.map(item => item.id === id ? { ...item, pago: 1 } : item))
    try { await api.patch(`/contas/${id}`) }
    catch (e) { setContasCompletas(backup); toast('Erro ao marcar como paga.', 'error') }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPendente = contas.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = contas.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0)

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Contas a Pagar</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1 text-sm md:text-base'>Acompanhe e adicione suas despesas</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))}
              className='border px-3 py-2 rounded-xl cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
              className='border px-3 py-2 rounded-xl cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => setModalOpen(true)} className='w-full sm:w-auto bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Nova Conta</button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)' }} className='text-xs mb-4'>📅 Novas contas em <span className='text-green-500 font-semibold'>{mesesNomes[mesFiltro]} {anoFiltro}</span></p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <div className='rounded-2xl p-4 md:p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-xs md:text-sm'>Pendentes no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-yellow-500 mt-1 md:mt-2'>{fmt(totalPendente)}</h2>
        </div>
        <div className='rounded-2xl p-4 md:p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-xs md:text-sm'>Pagas no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-green-500 mt-1 md:mt-2'>{fmt(totalPago)}</h2>
        </div>
        <div className='rounded-2xl p-4 md:p-6 border col-span-2 md:col-span-1' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }} className='text-xs md:text-sm'>Total no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-red-500 mt-1 md:mt-2'>{fmt(totalPendente + totalPago)}</h2>
        </div>
      </div>

      <div className='rounded-2xl border overflow-x-auto' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <table className='w-full text-left min-w-[600px]'>
          <thead>
            <tr style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }} className='border-b'>
              <th className='p-4'>Descrição</th><th className='p-4'>Categoria</th><th className='p-4'>Valor</th><th className='p-4'>Data</th><th className='p-4'>Status</th><th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id} className='border-b hover:opacity-80 transition' style={{ borderColor: 'var(--border-color)' }}>
                <td className='p-4 font-semibold' style={{ color: 'var(--text-main)' }}>{c.descricao}</td>
                <td className='p-4' style={{ color: 'var(--text-muted)' }}>{c.categoria_nome || '—'}</td>
                <td className='p-4 text-red-500 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4 text-sm' style={{ color: 'var(--text-muted)' }}>{c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td className='p-4'>
                  {c.pago ? <span className='bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm'>Paga</span>
                          : <span className='bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm'>Pendente</span>}
                </td>
                <td className='p-4 flex gap-3'>
                  {!c.pago && <button onClick={() => marcarPaga(c.id)} className='text-green-500 hover:text-green-400 transition text-sm'>Pagar</button>}
                  <button onClick={() => abrirModalParaEditar(c)} className='text-blue-500 hover:text-blue-400 transition text-sm'>Editar</button>
                  <button onClick={() => excluir(c.id)} className='text-red-500 hover:text-red-400 transition text-sm'>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contas.length === 0 && <p style={{ color: 'var(--text-muted)' }} className='text-center py-8'>Nenhuma conta em {mesesNomes[mesFiltro]} {anoFiltro}</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={contaEditando ? 'Editar Conta' : `Nova Conta — ${mesesNomes[mesFiltro]} ${anoFiltro}`}>
        <div className='space-y-5'>
          {error && <div className='bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 text-xs font-bold'>⚠️ {error}</div>}
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Descrição</label>
            <input type='text' value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={sugerirCategoria}
              className={`w-full rounded-2xl border px-6 py-4 outline-none focus:border-green-500 transition-all ${suggesting ? 'border-green-500 animate-pulse' : ''}`}
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} placeholder='Ex: Aluguel, Supermercado...' />
          </div>
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder='0.00' type='number' step='0.01'
              className='w-full rounded-2xl p-6 border text-xl font-black outline-none focus:border-green-400 transition-all'
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
          </div>
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Categoria</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className='w-full rounded-2xl p-6 border outline-none focus:border-green-400 appearance-none transition-all'
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              <option value=''>Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className='flex items-center gap-3 p-2'>
            <input type='checkbox' id='pago' checked={pago} onChange={e => setPago(e.target.checked)} className='w-5 h-5 accent-green-500' />
            <label htmlFor='pago' className='text-sm font-bold cursor-pointer uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>Já está paga?</label>
          </div>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-[2rem] px-8 py-5 font-black uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-60 shadow-xl active:scale-95'>
            {loading ? 'Sincronizando...' : contaEditando ? 'Atualizar Despesa' : 'Salvar Conta'}
          </button>
        </div>
      </Modal>
    </>
  )
}
