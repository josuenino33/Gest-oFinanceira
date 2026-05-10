import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function QuickAddExpense({ isOpen, onClose }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (isOpen) {
      api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {})
      setSucesso(false)
      setDescricao('')
      setValor('')
      setCategoriaId('')
    }
  }, [isOpen])

  const sugestoesRapidas = [
    { label: '🍔 Lanche', valor: '15.00' },
    { label: '☕ Café', valor: '8.00' },
    { label: '🚗 Uber', valor: '20.00' },
    { label: '🛒 Mercado', valor: '50.00' },
    { label: '⛽ Gasolina', valor: '100.00' },
    { label: '💊 Farmácia', valor: '30.00' },
  ]

  const registrar = async () => {
    if (!descricao.trim() || !valor) return
    const valorNumerico = Number(valor.replace(',', '.'))
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) return
    setLoading(true)
    try {
      await api.post('/contas', {
        descricao,
        valor: valorNumerico,
        categoria_id: categoriaId || null,
      })
      setSucesso(true)
      setTimeout(() => {
        onClose()
        setSucesso(false)
      }, 1200)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const usarSugestao = (sug) => {
    setDescricao(sug.label.replace(/^[^\s]+\s/, ''))
    setValor(sug.valor)
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-end lg:items-center justify-center'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose} />

      <div className='relative bg-[#0b1728] border border-gray-700 rounded-t-3xl lg:rounded-2xl p-6 w-full max-w-lg mx-0 lg:mx-4 shadow-2xl animate-[slideUp_0.25s_ease-out] safe-area-bottom'>
        {sucesso ? (
          <div className='text-center py-8'>
            <div className='text-5xl mb-4'>✅</div>
            <h2 className='text-xl font-bold text-green-400'>Saída registrada!</h2>
            <p className='text-gray-400 mt-2'>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        ) : (
          <>
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-xl font-bold'>💸 Registrar Saída</h2>
              <button onClick={onClose} className='text-gray-400 hover:text-white text-xl transition'>✕</button>
            </div>

            {/* Sugestões rápidas */}
            <div className='flex flex-wrap gap-2 mb-5'>
              {sugestoesRapidas.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => usarSugestao(sug)}
                  className='bg-[#132238] px-3 py-1.5 rounded-full text-xs text-gray-300 hover:bg-green-500/20 hover:text-green-400 transition border border-gray-700/50'
                >
                  {sug.label}
                </button>
              ))}
            </div>

            <div className='space-y-3'>
              <input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder='O que você gastou? (ex: Lanche)'
                className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400 text-sm'
                autoFocus
              />

              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm'>R$</span>
                <input
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder='0,00'
                  inputMode='decimal'
                  className='w-full bg-[#111f34] rounded-xl p-4 pl-12 border border-gray-700 text-white outline-none focus:border-green-400 text-2xl font-bold'
                />
              </div>

              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className='w-full bg-[#111f34] rounded-xl p-3 border border-gray-700 text-white outline-none focus:border-green-400 text-sm'
              >
                <option value=''>Categoria (opcional)</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>

              <button
                onClick={registrar}
                disabled={loading || !descricao || !valor}
                className='w-full bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-40 text-base active:scale-[0.98]'
              >
                {loading ? 'Salvando...' : 'Registrar Saída'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
