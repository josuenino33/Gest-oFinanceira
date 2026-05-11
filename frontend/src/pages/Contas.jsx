import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Contas() {
  const [contasCompletas, setContasCompletas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
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
      if (res.data.categoria_id) {
        setCategoriaId(res.data.categoria_id)
      }
    } catch (e) {
      console.error('Erro ao sugerir categoria:', e)
    } finally {
      setSuggesting(false)
    }
  }

  const carregar = () => {
    api.get('/contas').then(r => setContasCompletas(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  // Filtrar pelo mês/ano selecionado
  const contas = contasCompletas.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const salvar = async () => {
    if (!descricao.trim() || !valor) {
      alert('Informe a descrição e o valor da conta.')
      return
    }
    const valorNumerico = Number(String(valor).replace(',', '.'))
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert('Informe um valor válido para a conta.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        descricao,
        valor: valorNumerico,
        categoria_id: categoriaId || null,
        pago: contaEditando ? contaEditando.pago : 0
      }
      if (contaEditando) {
        await api.put(`/contas/${contaEditando.id}`, payload)
      } else {
        // Nova conta: usar a data do mês filtrado
        const dia = String(new Date().getDate()).padStart(2, '0')
        const hora = new Date().toTimeString().split(' ')[0]
        payload.criado_em = `${anoFiltro}-${String(mesFiltro + 1).padStart(2, '0')}-${dia} ${hora}`
        await api.post('/contas', payload)
      }
      fecharModal()
      carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar conta') }
    finally { setLoading(false) }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setContaEditando(null)
    setDescricao('')
    setValor('')
    setCategoriaId('')
  }

  const abrirModalParaEditar = (conta) => {
    setContaEditando(conta)
    setDescricao(conta.descricao)
    setValor(conta.valor)
    setCategoriaId(conta.categoria_id || '')
    setModalOpen(true)
  }

  const excluir = async (id) => {
    try {
      await api.delete(`/contas/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir conta. Verifique sua conexão ou se você tem permissão.')
    }
  }

  const marcarPaga = async (id) => {
    try {
      await api.patch(`/contas/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como paga.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPendente = contas.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)
  const totalPago = contas.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0)

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Contas a Pagar</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Acompanhe e adicione suas despesas</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'>
              {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'>
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => setModalOpen(true)} className='w-full sm:w-auto bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            + Nova Conta
          </button>
        </div>
      </div>

      <p className='text-gray-500 text-xs mb-4'>
        📅 Novas contas serão adicionadas em <span className='text-green-400 font-semibold'>{mesesNomes[mesFiltro]} {anoFiltro}</span>
      </p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Pendentes no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-yellow-400 mt-1 md:mt-2'>{fmt(totalPendente)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Pagas no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-green-400 mt-1 md:mt-2'>{fmt(totalPago)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 col-span-2 md:col-span-1'>
          <p className='text-gray-400 text-xs md:text-sm'>Total no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-red-400 mt-1 md:mt-2'>{fmt(totalPendente + totalPago)}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-x-auto'>
        <table className='w-full text-left min-w-[600px]'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Descrição</th>
              <th className='p-4'>Categoria</th>
              <th className='p-4'>Valor</th>
              <th className='p-4'>Data</th>
              <th className='p-4'>Status</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{c.descricao}</td>
                <td className='p-4 text-gray-400'>{c.categoria_nome || '—'}</td>
                <td className='p-4 text-red-400 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4 text-gray-500 text-sm'>{c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td className='p-4'>
                  {c.pago
                    ? <span className='bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm'>Paga</span>
                    : <span className='bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm'>Pendente</span>}
                </td>
                <td className='p-4 flex gap-3'>
                  {!c.pago && (
                    <button onClick={() => marcarPaga(c.id)} className='text-green-400 hover:text-green-300 transition text-sm'>Pagar</button>
                  )}
                  <button onClick={() => abrirModalParaEditar(c)} className='text-blue-400 hover:text-blue-300 transition text-sm'>Editar</button>
                  <button onClick={() => excluir(c.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contas.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma conta em {mesesNomes[mesFiltro]} {anoFiltro}</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={contaEditando ? 'Editar Conta' : `Nova Conta — ${mesesNomes[mesFiltro]} ${anoFiltro}`}>
        <div className='space-y-4'>
          <input
              type='text'
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={sugerirCategoria}
              className={`w-full rounded-xl border ${suggesting ? 'border-green-500 animate-pulse' : 'border-gray-700'} bg-[#111f34] px-4 py-2 text-white outline-none focus:border-green-500`}
              placeholder='Ex: Aluguel, Supermercado...'
            />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor' type="number" step="0.01"
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </button>
        </div>
      </Modal>
    </>
  )
}
