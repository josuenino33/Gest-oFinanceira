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

  // Filtrar pelo mês/ano selecionado
  const compras = comprasCompletas.filter(item => {
    if (!item.criado_em) return false
    const d = new Date(item.criado_em)
    return d.getMonth() === mesFiltro && d.getFullYear() === anoFiltro
  })

  const salvar = async () => {
    if (!cartaoId || !descricao.trim() || !valor) {
      alert('Selecione o cartão e informe a descrição e o valor da compra.')
      return
    }
    const valorNumerico = Number(String(valor).replace(',', '.'))
    const parcelasNumerico = Number(parcelas)
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0 || !Number.isInteger(parcelasNumerico) || parcelasNumerico <= 0) {
      alert('Informe valor e número de parcelas válidos.')
      return
    }
    setLoading(true)
    try {
      if (compraEditando) {
        const payload = {
          cartao_id: Number(cartaoId),
          descricao,
          valor: valorNumerico,
          parcelas: parcelasNumerico,
          pago: compraEditando.pago
        }
        await api.put(`/compras-cartao/${compraEditando.id}`, payload)
      } else {
        // Nova compra: enviar mês e ano da compra para o backend distribuir parcelas
        const payload = {
          cartao_id: Number(cartaoId),
          descricao,
          valor: valorNumerico,
          parcelas: parcelasNumerico,
          mes_compra: mesCompra + 1,  // 1-12
          ano_compra: anoCompra,
        }
        await api.post('/compras-cartao', payload)
      }
      fecharModal()
      carregar()
    } catch (e) { console.error(e); alert('Erro ao salvar compra.') }
    finally { setLoading(false) }
  }

  const fecharModal = () => {
    setModalOpen(false)
    setCompraEditando(null)
    setCartaoId('')
    setDescricao('')
    setValor('')
    setParcelas('1')
    setMesCompra(mesFiltro)
    setAnoCompra(anoFiltro)
  }

  const abrirModalParaEditar = (compra) => {
    setCompraEditando(compra)
    setCartaoId(compra.cartao_id)
    setDescricao(compra.descricao)
    setValor(compra.valor)
    setParcelas(compra.parcelas)
    setModalOpen(true)
  }

  const excluir = async (id) => {
    try {
      await api.delete(`/compras-cartao/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir compra.')
    }
  }

  const marcarPaga = async (id) => {
    try {
      await api.patch(`/compras-cartao/${id}`)
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como paga.')
    }
  }

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalMes = compras.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = compras.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0)

  // Gerar preview da distribuição das parcelas
  const gerarPreviewParcelas = () => {
    const num = Number(parcelas) || 1
    const val = Number(String(valor).replace(',', '.')) || 0
    const parcVal = val / num
    const items = []
    for (let i = 0; i < num; i++) {
      let m = mesCompra + i
      let a = anoCompra
      while (m > 11) { m -= 12; a += 1 }
      items.push({ mes: mesesNomes[m], ano: a, parcela: i + 1, valor: parcVal })
    }
    return items
  }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Compras no Cartão</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Acompanhe suas compras parceladas</p>
        </div>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500'>Mês:</span>
            <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'>
              {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
              className='bg-[#111f34] border border-gray-700 px-3 py-2 rounded-xl text-white cursor-pointer outline-none focus:border-green-500/50 text-xs md:text-sm'>
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => { setMesCompra(mesFiltro); setAnoCompra(anoFiltro); setModalOpen(true) }} className='w-full sm:w-auto bg-green-500 px-6 py-3 rounded-xl font-semibold hover:bg-green-400 transition'>
            + Nova Compra
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Total no Mês</p>
          <h2 className='text-3xl font-bold text-green-400 mt-2'>{fmt(totalMes)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Pendente no Mês</p>
          <h2 className='text-3xl font-bold text-yellow-400 mt-2'>{fmt(totalPendente)}</h2>
        </div>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <p className='text-gray-400 text-sm'>Parcelas no Mês</p>
          <h2 className='text-3xl font-bold mt-2'>{compras.length}</h2>
        </div>
      </div>

      <div className='bg-[#0d1a2d] rounded-2xl border border-gray-800 overflow-x-auto'>
        <table className='w-full text-left min-w-[700px]'>
          <thead>
            <tr className='text-gray-400 border-b border-gray-700'>
              <th className='p-4'>Compra</th>
              <th className='p-4'>Cartão</th>
              <th className='p-4'>Parcela</th>
              <th className='p-4'>Valor da Parcela</th>
              <th className='p-4'>Status</th>
              <th className='p-4'>Ações</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id} className='border-b border-gray-800 hover:bg-[#132238] transition'>
                <td className='p-4 font-semibold'>{c.descricao}</td>
                <td className='p-4 text-gray-400'>{c.cartao_nome} ({c.bandeira})</td>
                <td className='p-4'>
                  <span className='bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm'>
                    {c.parcela_atual}/{c.parcelas}x
                  </span>
                </td>
                <td className='p-4 text-green-400 font-bold'>{fmt(c.valor)}</td>
                <td className='p-4'>
                  {c.pago
                    ? <span className='bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm'>Paga</span>
                    : <span className='bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm'>Pendente</span>}
                </td>
                <td className='p-4'>
                  <div className='flex gap-2 flex-col sm:flex-row'>
                    {!c.pago && (
                      <button onClick={() => marcarPaga(c.id)} className='text-green-400 hover:text-green-300 transition text-sm'>Pagar</button>
                    )}
                    <button onClick={() => abrirModalParaEditar(c)} className='text-blue-400 hover:text-blue-300 transition text-sm'>Editar</button>
                    <button onClick={() => excluir(c.id)} className='text-red-400 hover:text-red-300 transition text-sm'>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {compras.length === 0 && <p className='text-gray-500 text-center py-8'>Nenhuma parcela em {mesesNomes[mesFiltro]} {anoFiltro}</p>}
      </div>

      <Modal isOpen={modalOpen} onClose={fecharModal} title={compraEditando ? 'Editar Compra' : 'Nova Compra no Cartão'}>
        <div className='space-y-4'>
          <select value={cartaoId} onChange={e => setCartaoId(e.target.value)}
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
            <option value=''>Selecione o cartão</option>
            {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.bandeira})</option>)}
          </select>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder='Descrição da compra'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder='Valor total da compra' type='number' step='0.01'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
          <input value={parcelas} onChange={e => setParcelas(e.target.value)} placeholder='Número de parcelas' type='number' min='1'
            className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />

          {!compraEditando && (
            <>
              <div className='flex gap-3'>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>Mês da compra</label>
                  <select value={mesCompra} onChange={e => setMesCompra(Number(e.target.value))}
                    className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
                    {mesesNomes.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>Ano</label>
                  <select value={anoCompra} onChange={e => setAnoCompra(Number(e.target.value))}
                    className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400'>
                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview da distribuição */}
              {valor && Number(parcelas) > 0 && (
                <div className='bg-[#0b1728] rounded-xl p-4 border border-gray-800'>
                  <p className='text-xs text-gray-400 mb-3 font-semibold'>📋 Distribuição das parcelas:</p>
                  <div className='space-y-2 max-h-40 overflow-y-auto'>
                    {gerarPreviewParcelas().map((p, i) => (
                      <div key={i} className='flex justify-between text-sm'>
                        <span className='text-gray-300'>
                          <span className='text-blue-400'>{p.parcela}/{parcelas}x</span> — {p.mes} {p.ano}
                        </span>
                        <span className='text-green-400 font-semibold'>{fmt(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                  <div className='border-t border-gray-700 mt-3 pt-2 flex justify-between text-sm font-bold'>
                    <span className='text-gray-300'>Total</span>
                    <span className='text-green-400'>{fmt(Number(String(valor).replace(',', '.')) || 0)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          <button onClick={salvar} disabled={loading}
            className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
            {loading ? 'Salvando...' : compraEditando ? 'Salvar Alteração' : `Registrar em ${Number(parcelas) || 1}x`}
          </button>
        </div>
      </Modal>
    </>
  )
}
