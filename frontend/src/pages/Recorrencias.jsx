import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'

const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Recorrencias() {
  const toast = useToast()
  const [lista, setLista] = useState([])
  const [categorias, setCategorias] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [tipo, setTipo] = useState('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [dia, setDia] = useState('1')
  const [loading, setLoading] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')

  const carregar = () => {
    api.get('/recorrencias').then(r => setLista(r.data)).catch(console.error)
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }

  useEffect(() => {
    carregar()
    // Gera automaticamente o mês atual ao abrir a página (idempotente — não duplica)
    api.post('/recorrencias/gerar').catch(() => {})
  }, [])

  const salvar = async () => {
    if (!descricao.trim() || !valor) { toast('Preencha todos os campos.', 'warning'); return }
    const valorNum = Number(String(valor).replace(',', '.'))
    if (!valorNum || valorNum <= 0) { toast('Valor inválido.', 'warning'); return }
    setLoading(true)
    try {
      await api.post('/recorrencias', { tipo, descricao, valor: valorNum, categoria_id: categoriaId || null, dia: Number(dia) })
      toast('Recorrência criada com sucesso!', 'success')
      fecharModal(); carregar()
    } catch (e) { toast('Erro ao criar recorrência.', 'error') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setTipo('despesa'); setDescricao(''); setValor(''); setCategoriaId(''); setDia('1') }

  const excluir = async (id) => {
    try { await api.delete(`/recorrencias/${id}`); toast('Excluída.', 'success'); carregar() }
    catch (e) { toast('Erro ao excluir.', 'error') }
  }

  const toggleAtivo = async (id) => {
    try { await api.patch(`/recorrencias/${id}`); carregar() }
    catch (e) { toast('Erro ao atualizar.', 'error') }
  }

  const gerarMes = async () => {
    setGerando(true)
    try {
      const res = await api.post('/recorrencias/gerar')
      toast(res.data.msg, res.data.geradas > 0 ? 'success' : 'info')
      carregar()
    } catch (e) { toast('Erro ao gerar transações.', 'error') }
    finally { setGerando(false) }
  }

  const listaFiltrada = lista.filter(r => {
    const matchBusca = !busca || r.descricao.toLowerCase().includes(busca.toLowerCase())
    const matchTipo = !tipoFiltro || r.tipo === tipoFiltro
    return matchBusca && matchTipo
  })

  const now = new Date()
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Transações Recorrentes</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1 text-sm'>Receitas e despesas que se repetem todo mês</p>
        </div>
        <div className='flex gap-3 flex-wrap'>
          <button onClick={gerarMes} disabled={gerando}
            className='bg-blue-500 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-400 transition disabled:opacity-60 text-sm'>
            {gerando ? 'Gerando...' : `⚡ Gerar ${mesesNomes[now.getMonth()]}/${now.getFullYear()}`}
          </button>
          <button onClick={() => setModalOpen(true)} className='bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            + Nova Recorrência
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {[
          { l: 'Total Ativos', v: lista.filter(r => r.ativo).length, c: '' },
          { l: 'Receitas/mês', v: fmt(lista.filter(r => r.ativo && r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0)), c: 'text-green-500' },
          { l: 'Despesas/mês', v: fmt(lista.filter(r => r.ativo && r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0)), c: 'text-red-500' },
        ].map((item, i) => (
          <div key={i} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{item.l}</p>
            <h2 className={`text-3xl font-bold mt-2 ${item.c}`} style={!item.c ? { color: 'var(--text-main)' } : {}}>{item.v}</h2>
          </div>
        ))}
      </div>

      <div className='rounded-2xl border overflow-hidden' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className='flex flex-col sm:flex-row gap-2 p-3 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <input type='text' placeholder='Buscar descrição...' value={busca} onChange={e => setBusca(e.target.value)}
            className='flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500 transition'
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
            className='border rounded-xl px-3 py-2 text-sm outline-none'
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
            <option value=''>Todos os tipos</option>
            <option value='receita'>↑ Receita</option>
            <option value='despesa'>↓ Despesa</option>
          </select>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full text-left table-3col'>
            <thead>
              <tr className='border-b' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                <th className='p-4'>Descrição</th>
                <th className='p-4'>Tipo</th>
                <th className='p-4'>Valor</th>
                <th className='p-4'>Dia</th>
                <th className='p-4'>Status</th>
                <th className='p-4'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((r) => (
                <tr key={r.id} className={`border-b transition hover:opacity-80 ${!r.ativo ? 'opacity-40' : ''}`} style={{ borderColor: 'var(--border-color)' }}>
                  <td className='p-4'>
                    <p className='font-semibold' style={{ color: 'var(--text-main)' }}>{r.descricao}</p>
                    {r.categoria_nome && <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>{r.categoria_nome}</p>}
                  </td>
                  <td className='p-4'>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.tipo === 'receita' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'}`}>
                      {r.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                    </span>
                  </td>
                  <td className={`p-4 font-bold ${r.tipo === 'receita' ? 'text-green-500' : 'text-red-400'}`}>{fmt(r.valor)}</td>
                  <td className='p-4 text-sm' style={{ color: 'var(--text-muted)' }}>Dia {r.dia}</td>
                  <td className='p-4'>
                    {r.ativo
                      ? <span className='bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs'>Ativo</span>
                      : <span className='bg-gray-500/20 text-gray-500 px-3 py-1 rounded-full text-xs'>Pausado</span>}
                  </td>
                  <td className='p-4 flex gap-3'>
                    <button onClick={() => toggleAtivo(r.id)} className='text-blue-500 hover:text-blue-400 text-sm transition'>
                      {r.ativo ? 'Pausar' : 'Ativar'}
                    </button>
                    <button onClick={() => excluir(r.id)} className='text-red-500 hover:text-red-400 text-sm transition'>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listaFiltrada.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }} className='text-center py-10'>
              {busca || tipoFiltro ? 'Nenhuma recorrência encontrada para o filtro aplicado.' : 'Nenhuma recorrência cadastrada. Adicione receitas e despesas fixas mensais!'}
            </p>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title='Nova Recorrência'>
        <div className='space-y-4'>
          <div className='flex gap-3'>
            {['despesa', 'receita'].map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${tipo === t ? (t === 'receita' ? 'bg-green-500 text-black' : 'bg-red-500 text-white') : 'border'}`}
                style={tipo !== t ? inputStyle : {}}>
                {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição (ex: Salário, Aluguel)'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor' type='number' step='0.01'
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
            className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
            <option value=''>Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div>
            <label className='text-xs mb-2 block' style={{ color: 'var(--text-muted)' }}>Dia do mês para gerar</label>
            <input value={dia} onChange={e => setDia(e.target.value)} type='number' min='1' max='28' placeholder='Dia (1-28)'
              className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          </div>
          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : 'Criar Recorrência'}
          </button>
        </div>
      </Modal>
    </>
  )
}
