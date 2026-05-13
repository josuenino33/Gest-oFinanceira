import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Receitas() {
  const [listaCompleta, setListaCompleta] = useState([])
  const [categorias, setCategorias] = useState([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [receitaEditando, setReceitaEditando] = useState(null)

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
    api.get('/receitas').then(r => setListaCompleta(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => { carregar() }, [])

  // Filtrar lista pelo mês/ano selecionado
  const lista = listaCompleta.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const salvar = async () => {
    if (!descricao.trim() || !valor) {
      alert('Informe a descrição e o valor da receita.')
      return
    }

    const valorNumerico = Number(String(valor).replace(',', '.'))
    const payload = {
      descricao,
      valor: valorNumerico,
      categoria_id: categoriaId || null,
      criado_em: `${anoFiltro}-${String(mesFiltro + 1).padStart(2, '0')}-15 12:00:00`
    }

    // --- UPDATE OTIMISTA (SENSACAO INSTANTANEA) ---
    const tempId = Date.now()
    const categoriaEncontrada = categorias.find(c => String(c.id) === String(categoriaId))
    const itemOtimista = {
      ...payload,
      id: tempId,
      categoria_nome: categoriaEncontrada ? categoriaEncontrada.nome : '—',
      otimista: true // Flag para controle interno se precisar
    }

    // Se for nova, adiciona logo na lista
    if (!receitaEditando) {
      setListaCompleta(prev => [itemOtimista, ...prev])
    } else {
      // Se for edição, atualiza na lista
      setListaCompleta(prev => prev.map(item => item.id === receitaEditando.id ? { ...item, ...payload } : item))
    }
    
    fecharModal()
    // ----------------------------------------------

    setLoading(true)
    setError(null)
    try {
      if (receitaEditando) {
        await api.put(`/receitas/${receitaEditando.id}`, payload)
      } else {
        await api.post('/receitas', payload)
      }
      carregar() // Sincroniza com o ID real do banco
    } catch (e) { 
      console.error('Erro detalhado:', e.response?.data || e.message)
      setError(e.response?.data?.msg || 'Erro ao conectar com o servidor.')
      carregar() // Reverte para o estado seguro do banco
    } finally { 
      setLoading(false)
    }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setReceitaEditando(null)
    setDescricao('')
    setValor('')
    setCategoriaId('')
  }

  const abrirModalParaEditar = (receita) => {
    setReceitaEditando(receita)
    setDescricao(receita.descricao)
    setValor(receita.valor)
    setCategoriaId(receita.categoria_id || '')
    setModalOpen(true)
  }

  const excluir = async (id) => {
    // --- UPDATE OTIMISTA ---
    const backup = [...listaCompleta]
    setListaCompleta(prev => prev.filter(item => item.id !== id))
    // -----------------------

    try {
      await api.delete(`/receitas/${id}`)
      // Não precisa fazer nada, o item já sumiu otimistamente
    } catch (e) {
      console.error(e)
      setListaCompleta(backup) // Reverte se der erro
      alert('Erro ao excluir receita. Tente novamente.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const total = lista.reduce((s, r) => s + Number(r.valor), 0)

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Receitas</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Cadastre e acompanhe suas entradas</p>
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
            + Nova Receita
          </button>
        </div>
      </div>

      <p className='text-gray-500 text-xs mb-4'>
        📅 Novas receitas serão adicionadas em <span className='text-green-400 font-semibold'>{mesesNomes[mesFiltro]} {anoFiltro}</span>
      </p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Total no Mês</p>
          <h2 className='text-xl md:text-3xl font-bold text-green-400 mt-1 md:mt-2'>{fmt(total)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <p className='text-gray-400 text-xs md:text-sm'>Quantidade</p>
          <h2 className='text-xl md:text-3xl font-bold mt-1 md:mt-2'>{lista.length}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 col-span-2 md:col-span-1'>
          <p className='text-gray-400 text-xs md:text-sm'>Média por Receita</p>
          <h2 className='text-xl md:text-3xl font-bold text-blue-400 mt-1 md:mt-2'>{lista.length > 0 ? fmt(total / lista.length) : 'R$ 0,00'}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-x-auto'>
        <table className='w-full text-left min-w-[500px]'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Descrição</th>
              <th className='p-4'>Categoria</th>
              <th className='p-4'>Valor</th>
              <th className='p-4'>Data</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((item) => (
              <tr key={item.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{item.descricao}</td>
                <td className='p-4 text-gray-400'>{item.categoria_nome || '—'}</td>
                <td className='p-4 text-green-400 font-bold'>{fmt(item.valor)}</td>
                <td className='p-4 text-gray-500 text-sm'>{item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td className='p-4 flex gap-3'>
                  <button onClick={() => abrirModalParaEditar(item)} className='text-blue-400 hover:text-blue-300 transition text-sm'>Editar</button>
                  <button onClick={() => excluir(item.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma receita em {mesesNomes[mesFiltro]} {anoFiltro}</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={receitaEditando ? 'Editar Receita' : `Nova Receita — ${mesesNomes[mesFiltro]} ${anoFiltro}`}>
        <div className='space-y-5'>
          {error && (
            <div className='bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 text-xs font-bold leading-relaxed animate-in fade-in zoom-in duration-300'>
              ⚠️ {error}
            </div>
          )}

          <div className='space-y-2'>
            <label className='text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1'>Descrição</label>
            <input
              type='text'
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={sugerirCategoria}
              className={`w-full rounded-2xl border ${suggesting ? 'border-green-500 animate-pulse' : 'border-[var(--border-color)]'} bg-[var(--bg-input)] px-6 py-4 text-white outline-none focus:border-green-500 transition-all`}
              placeholder='Ex: Salário, Venda...'
            />
          </div>

          <div className='space-y-2'>
            <label className='text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1'>Valor (R$)</label>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder='0.00' type='number' step='0.01'
              className='w-full bg-[var(--bg-input)] rounded-2xl p-6 border border-[var(--border-color)] text-white text-xl font-black outline-none focus:border-green-400 transition-all' />
          </div>

          <div className='space-y-2'>
            <label className='text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1'>Categoria</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className='w-full bg-[var(--bg-input)] rounded-2xl p-6 border border-[var(--border-color)] text-white outline-none focus:border-green-400 appearance-none transition-all'>
              <option value=''>Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-[2rem] px-8 py-5 font-black uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-60 shadow-xl shadow-green-500/10 active:scale-95'>
            {loading ? 'Sincronizando...' : receitaEditando ? 'Atualizar Lançamento' : 'Salvar Receita'}
          </button>
        </div>
      </Modal>
    </>
  )
}
