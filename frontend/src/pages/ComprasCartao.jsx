import { useEffect, useState } from 'react'
import api from '../utils/api'
import Modal from '../components/Modal'

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function ComprasCartao() {
  const [comprasCompletas, setComprasCompletas] = useState([])
  const [cartoes, setCartoes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [cartaoId, setCartaoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState('1')
  const [mesCompra, setMesCompra] = useState(new Date().getMonth())
  const [anoCompra, setAnoCompra] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [compraEditando, setCompraEditando] = useState(null)

  const now = new Date()
  const [mesFiltro, setMesFiltro] = useState(now.getMonth())
  const [anoFiltro, setAnoFiltro] = useState(now.getFullYear())

  const carregar = () => {
    api.get('/compras-cartao').then(r => setComprasCompletas(r.data)).catch(console.error)
    api.get('/cartoes').then(r => setCartoes(r.data)).catch(() => {})
  }
  useEffect(() => { carregar() }, [])

  const compras = comprasCompletas.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const salvar = async () => {
    if (!cartaoId || !descricao.trim() || !valor) { alert('Preencha todos os campos.'); return }
    const valorNum = Number(String(valor).replace(',', '.'))
    const parcelasNum = Number(parcelas)
    if (!Number.isFinite(valorNum) || valorNum <= 0 || !Number.isInteger(parcelasNum) || parcelasNum <= 0) { alert('Valores inválidos.'); return }
    setLoading(true)
    try {
      if (compraEditando) {
        await api.put(`/compras-cartao/${compraEditando.id}`, { cartao_id: Number(cartaoId), descricao, valor: valorNum, parcelas: parcelasNum, pago: compraEditando.pago })
      } else {
        await api.post('/compras-cartao', { cartao_id: Number(cartaoId), descricao, valor: valorNum, parcelas: parcelasNum, mes_compra: mesCompra + 1, ano_compra: anoCompra })
      }
      fecharModal(); carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar compra.') }
    finally { setLoading(false) }
  }

  const fecharModal = () => { setModalOpen(false); setCompraEditando(null); setCartaoId(''); setDescricao(''); setValor(''); setParcelas('1'); setMesCompra(mesFiltro); setAnoCompra(anoFiltro) }
  const abrirModalParaEditar = (c) => { setCompraEditando(c); setCartaoId(c.cartao_id); setDescricao(c.descricao); setValor(c.valor); setParcelas(c.parcelas); setModalOpen(true) }
  const excluir = async (id) => { try { await api.delete(`/compras-cartao/${id}`); carregar() } catch (e) { alert('Erro ao excluir.') } }
  const marcarPaga = async (id) => { try { await api.patch(`/compras-cartao/${id}`); carregar() } catch (e) { alert('Erro ao marcar como paga.') } }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalMes = compras.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = compras.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)

  const gerarPreviewParcelas = () => {
    const num = Number(parcelas) || 1
    const val = Number(String(valor).replace(',', '.')) || 0
    const parcVal = val / num
    const items = []
    for (let i = 0; i < num; i++) {
      let m = mesCompra + 1 + i; let a = anoCompra  // +1: fatura começa no mês seguinte
      while (m > 11) { m -= 12; a += 1 }
      items.push({ mes: mesesNomes[m], ano: a, parcela: i + 1, valor: parcVal })
    }
    return items
  }

  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Compras no Cartão</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1 text-sm md:text-base'>Acompanhe suas compras parceladas</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} className='border px-3 py-2 rounded-xl cursor-pointer outline-none text-xs md:text-sm' style={inputStyle}>
              {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))} className='border px-3 py-2 rounded-xl cursor-pointer outline-none text-xs md:text-sm' style={inputStyle}>
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => { setMesCompra(mesFiltro); setAnoCompra(anoFiltro); setModalOpen(true) }} className='w-full sm:w-auto bg-green-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>+ Nova Compra</button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {[{ l: 'Total no Mês', v: fmt(totalMes), c: 'text-green-500' }, { l: 'Pendente no Mês', v: fmt(totalPendente), c: 'text-yellow-500' }, { l: 'Parcelas no Mês', v: compras.length, c: '' }].map((item, i) => (
          <div key={i} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{item.l}</p>
            <h2 className={`text-3xl font-bold mt-2 ${item.c}`} style={!item.c ? { color: 'var(--text-main)' } : {}}>{item.v}</h2>
          </div>
        ))}
      </div>

      <div className='rounded-2xl border overflow-x-auto' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <table className='w-full text-left min-w-[700px]'>
          <thead>
            <tr className='border-b' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              <th className='p-4'>Compra</th><th className='p-4'>Cartão</th><th className='p-4'>Parcela</th><th className='p-4'>Valor</th><th className='p-4'>Status</th><th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id} className='border-b hover:opacity-80 transition' style={{ borderColor: 'var(--border-color)' }}>
                <td className='p-4 font-semibold' style={{ color: 'var(--text-main)' }}>{c.descricao}</td>
                <td className='p-4' style={{ color: 'var(--text-muted)' }}>{c.cartao_nome} ({c.bandeira})</td>
                <td className='p-4'><span className='bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-sm'>{c.parcela_atual}/{c.parcelas}x</span></td>
                <td className='p-4 text-green-500 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4'>
                  {c.pago ? <span className='bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-sm'>Paga</span>
                          : <span className='bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm'>Pendente</span>}
                </td>
                <td className='p-4'>
                  <div className='flex gap-2 flex-col sm:flex-row'>
                    {!c.pago && <button onClick={() => marcarPaga(c.id)} className='text-green-500 hover:text-green-400 text-sm'>Pagar</button>}
                    <button onClick={() => abrirModalParaEditar(c)} className='text-blue-500 hover:text-blue-400 text-sm'>Editar</button>
                    <button onClick={() => excluir(c.id)} className='text-red-500 hover:text-red-400 text-sm'>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {compras.length === 0 && <p style={{ color: 'var(--text-muted)' }} className='text-center py-8'>Nenhuma parcela em {mesesNomes[mesFiltro]} {anoFiltro}</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={compraEditando ? 'Editar Compra' : 'Nova Compra no Cartão'}>
        <div className='space-y-4'>
          <select value={cartaoId} onChange={e => setCartaoId(e.target.value)} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
            <option value=''>Selecione o cartão</option>
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.bandeira})</option>)}
          </select>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição da compra' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor total' type='number' step='0.01' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
          <input value={parcelas} onChange={e => setParcelas(e.target.value)} placeholder='Parcelas' type='number' min='1' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />

          {!compraEditando && (
            <>
              <div className='flex gap-3'>
                <div className='flex-1'>
                  <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Mês da compra</label>
                  <select value={mesCompra} onChange={e => setMesCompra(Number(e.target.value))} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
                    {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className='flex-1'>
                  <label className='text-xs mb-1 block' style={{ color: 'var(--text-muted)' }}>Ano</label>
                  <select value={anoCompra} onChange={e => setAnoCompra(Number(e.target.value))} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle}>
                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {valor && Number(parcelas) > 0 && (
                <div className='rounded-xl p-4 border' style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)' }}>
                  <p className='text-xs mb-3 font-semibold' style={{ color: 'var(--text-muted)' }}>📋 Distribuição das parcelas:</p>
                  <div className='space-y-2 max-h-40 overflow-y-auto'>
                    {gerarPreviewParcelas().map((p, i) => (
                      <div key={i} className='flex justify-between text-sm'>
                        <span style={{ color: 'var(--text-main)' }}><span className='text-blue-500'>{p.parcela}/{parcelas}x</span> — {p.mes} {p.ano}</span>
                        <span className='text-green-500 font-semibold'>{fmt(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                  <div className='border-t mt-3 pt-2 flex justify-between text-sm font-bold' style={{ borderColor: 'var(--border-color)' }}>
                    <span style={{ color: 'var(--text-main)' }}>Total</span>
                    <span className='text-green-500'>{fmt(Number(String(valor).replace(',', '.')) || 0)}</span>
                  </div>
                </div>
              )}
            </>
          )}
          <button onClick={salvar} disabled={loading} className='w-full bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : compraEditando ? 'Salvar Alteração' : `Registrar em ${Number(parcelas) || 1}x`}
          </button>
        </div>
      </Modal>
    </>
  )
}
