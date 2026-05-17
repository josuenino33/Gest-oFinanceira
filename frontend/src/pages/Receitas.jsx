import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'
import TranscreverSMS from '../components/TranscreverSMS'
import ImpExpDropdown from '../components/ImpExpDropdown'

const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Receitas() {
  const toast = useToast()
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
  const [busca, setBusca] = useState('')
  const [categFiltro, setCategFiltro] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(null)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 10

  const sugerirCategoria = async () => {
    if (!descricao.trim() || categoriaId) return
    setSuggesting(true)
    try { const res = await api.post('/auto-categorize', { descricao }); if (res.data.categoria_id) setCategoriaId(res.data.categoria_id) }
    catch (e) { console.error(e) } finally { setSuggesting(false) }
  }

  const carregar = () => {
    api.get('/receitas').then(r => setListaCompleta(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }
  useEffect(() => { carregar() }, [])

  const lista = listaCompleta.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const listaFiltrada = lista.filter(r => {
    const matchBusca = !busca || r.descricao.toLowerCase().includes(busca.toLowerCase())
    const matchCateg = !categFiltro || String(r.categoria_id) === categFiltro
    return matchBusca && matchCateg
  })
  const totalPaginas = Math.ceil(listaFiltrada.length / POR_PAGINA)
  const listaPagina = listaFiltrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const salvar = async () => {
    if (!descricao.trim() || !valor) { toast('Informe a descrição e o valor.', 'warning'); return }
    const valorNum = Number(String(valor).replace(',', '.'))
    const payload = { descricao, valor: valorNum, categoria_id: categoriaId || null, criado_em: `${anoFiltro}-${String(mesFiltro + 1).padStart(2, '0')}-15 12:00:00` }
    const tempId = Date.now()
    const cat = categorias.find(c => String(c.id) === String(categoriaId))
    const itemOtimista = { ...payload, id: tempId, categoria_nome: cat ? cat.nome : '—' }

    if (!receitaEditando) setListaCompleta(prev => [itemOtimista, ...prev])
    else setListaCompleta(prev => prev.map(item => item.id === receitaEditando.id ? { ...item, ...payload } : item))
    fecharModal()

    setLoading(true); setError(null)
    try {
      if (receitaEditando) await api.put(`/receitas/${receitaEditando.id}`, payload)
      else await api.post('/receitas', payload)
      carregar()
    } catch (e) { setError(e.response?.data?.msg || 'Erro ao conectar.'); carregar() }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setReceitaEditando(null); setDescricao(''); setValor(''); setCategoriaId('') }

  const aoExtrairSMS = (dados) => {
    if (dados.tipo !== 'receita') return
    setDescricao(dados.descricao || '')
    setValor(dados.valor ? String(dados.valor) : '')
    if (dados.categoria_id) setCategoriaId(String(dados.categoria_id))
    setModalOpen(true)
  }
  const abrirModalParaEditar = (r) => { setReceitaEditando(r); setDescricao(r.descricao); setValor(r.valor); setCategoriaId(r.categoria_id || ''); setModalOpen(true) }
  const excluir = async (id) => {
    const backup = [...listaCompleta]
    setListaCompleta(prev => prev.filter(item => item.id !== id))
    setConfirmarExclusao(null)
    try { await api.delete(`/receitas/${id}`) } catch (e) { setListaCompleta(backup); toast('Erro ao excluir.', 'error') }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const total = lista.reduce((s, r) => s + Number(r.valor), 0)
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Receitas</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1 text-sm md:text-base'>Cadastre e acompanhe suas entradas</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} className='border px-3 py-2 rounded-xl cursor-pointer outline-none text-xs md:text-sm' style={inputStyle}>
              {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))} className='border px-3 py-2 rounded-xl cursor-pointer outline-none text-xs md:text-sm' style={inputStyle}>
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <TranscreverSMS onExtrair={aoExtrairSMS} />
          <ImpExpDropdown
            tipo='receitas'
            lista={lista}
            nomeArquivo={`receitas_${mesesNomes[mesFiltro]}_${anoFiltro}.csv`}
            colunasCsv={[
              { key: 'descricao', label: 'Descrição' },
              { key: 'valor', label: 'Valor', format: v => Number(v).toFixed(2).replace('.', ',') },
              { key: 'categoria_nome', label: 'Categoria' },
              { key: 'criado_em', label: 'Data' },
            ]}
            onImportado={carregar}
          />
          <button onClick={() => setModalOpen(true)} className='w-full sm:w-auto bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Nova Receita</button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)' }} className='text-xs mb-4'>📅 Novas receitas em <span className='text-green-500 font-semibold'>{mesesNomes[mesFiltro]} {anoFiltro}</span></p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8'>
        {[{ l: 'Total no Mês', v: fmt(total), c: 'text-green-500' }, { l: 'Quantidade', v: lista.length, c: '' }, { l: 'Média por Receita', v: lista.length > 0 ? fmt(total / lista.length) : 'R$ 0,00', c: 'text-blue-500' }].map((item, i) => (
          <div key={i} className={`rounded-2xl p-4 md:p-6 border ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-xs md:text-sm'>{item.l}</p>
            <h2 className={`text-xl md:text-3xl font-bold mt-1 md:mt-2 ${item.c}`} style={!item.c ? { color: 'var(--text-main)' } : {}}>{item.v}</h2>
          </div>
        ))}
      </div>

      <div className='rounded-2xl border overflow-hidden' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className='flex flex-col sm:flex-row gap-2 p-3 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <input type='text' placeholder='Buscar descrição...' value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            className='flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 transition'
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
          <select value={categFiltro} onChange={e => { setCategFiltro(e.target.value); setPagina(1) }}
            className='border rounded-xl px-3 py-2 text-sm outline-none'
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
            <option value=''>Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-left table-3col'>
            <thead>
              <tr className='border-b' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                <th className='p-4'>Descrição</th>
                <th className='p-4'>Categoria</th>
                <th className='p-4'>Valor</th>
                <th className='p-4'>Data</th>
                <th className='p-4'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaPagina.map((item) => (
                <tr key={item.id} className='border-b hover:opacity-80 transition' style={{ borderColor: 'var(--border-color)' }}>
                  <td className='p-4 font-semibold' style={{ color: 'var(--text-main)' }}>{item.descricao}</td>
                  <td className='p-4' style={{ color: 'var(--text-muted)' }}>{item.categoria_nome || '—'}</td>
                  <td className='p-4 text-green-500 font-bold'>{fmt(item.valor)}</td>
                  <td className='p-4 text-sm' style={{ color: 'var(--text-muted)' }}>{item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className='p-4 flex gap-3'>
                    <button onClick={() => abrirModalParaEditar(item)} className='text-blue-500 hover:text-blue-400 text-sm'>Editar</button>
                    <button onClick={() => setConfirmarExclusao(item)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listaFiltrada.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }} className='text-center py-8'>
              {busca || categFiltro ? 'Nenhuma receita encontrada para o filtro aplicado.' : `Nenhuma receita em ${mesesNomes[mesFiltro]} ${anoFiltro}`}
            </p>
          )}
          {totalPaginas > 1 && (
            <div className='flex items-center justify-between px-4 py-3 border-t' style={{ borderColor: 'var(--border-color)' }}>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, listaFiltrada.length)} de {listaFiltrada.length}
              </p>
              <div className='flex gap-2'>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  className='px-3 py-1 rounded-lg border text-sm transition hover:opacity-80 disabled:opacity-40'
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>← Anterior</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  className='px-3 py-1 rounded-lg border text-sm transition hover:opacity-80 disabled:opacity-40'
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>Próxima →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmarExclusao && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setConfirmarExclusao(null)} />
          <div className='relative border rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className='text-lg font-bold mb-2' style={{ color: 'var(--text-main)' }}>Excluir receita?</h2>
            <p className='text-sm mb-6' style={{ color: 'var(--text-muted)' }}>
              "<span className='font-semibold' style={{ color: 'var(--text-main)' }}>{confirmarExclusao.descricao}</span>" será excluída permanentemente.
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

      <Modal isOpen={modalOpen} onClose={fecharModal} title={receitaEditando ? 'Editar Receita' : `Nova Receita — ${mesesNomes[mesFiltro]} ${anoFiltro}`}>
        <div className='space-y-5'>
          {error && <div className='bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 text-xs font-bold'>⚠️ {error}</div>}
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Descrição</label>
            <input type='text' value={descricao} onChange={(e) => setDescricao(e.target.value)} onBlur={sugerirCategoria}
              className={`w-full rounded-2xl border px-6 py-4 outline-none focus:border-green-500 transition-all ${suggesting ? 'border-green-500 animate-pulse' : ''}`}
              style={inputStyle} placeholder='Ex: Salário, Venda...' />
          </div>
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder='0.00' type='number' step='0.01'
              className='w-full rounded-2xl p-6 border text-xl font-black outline-none focus:border-green-400 transition-all' style={inputStyle} />
          </div>
          <div className='space-y-2'>
            <label className='text-[10px] font-black uppercase tracking-widest ml-1' style={{ color: 'var(--text-muted)' }}>Categoria</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              className='w-full rounded-2xl p-6 border outline-none focus:border-green-400 appearance-none transition-all' style={inputStyle}>
              <option value=''>Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-[2rem] px-8 py-5 font-black uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-60 shadow-xl active:scale-95'>
            {loading ? 'Sincronizando...' : receitaEditando ? 'Atualizar Lançamento' : 'Salvar Receita'}
          </button>
        </div>
      </Modal>
    </>
  )
}
