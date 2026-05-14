import { useState } from 'react'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'

export default function TranscreverSMS({ onExtrair }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  const processar = async () => {
    if (!texto.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/ai/transcrever', { texto })
      if (res.data.erro) {
        toast('Não consegui identificar a transação. Tente descrever melhor.', 'warning')
        return
      }
      onExtrair(res.data)
      setOpen(false)
      setTexto('')
      toast('Dados extraídos com sucesso!', 'success')
    } catch {
      toast('Erro ao processar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:bg-green-500/10'
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <span>📱</span> Colar SMS / Extrato
      </button>

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={() => setOpen(false)} />
          <div className='relative w-full max-w-lg rounded-2xl p-6 border shadow-2xl z-10'
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className='text-lg font-black mb-1' style={{ color: 'var(--text-main)' }}>📱 Colar SMS ou Extrato</h3>
            <p className='text-xs mb-4' style={{ color: 'var(--text-muted)' }}>
              Cole o texto de um SMS do banco, notificação ou extrato. A IA vai extrair os dados automaticamente.
            </p>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={5}
              placeholder={'Exemplo:\n"Débito de R$ 127,50 em MERCADO LIVRE em 14/05"\n"PIX recebido: R$ 500,00 de João Silva"'}
              className='w-full rounded-xl p-4 border outline-none resize-none text-sm'
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <div className='flex gap-3 mt-4'>
              <button onClick={() => setOpen(false)}
                className='flex-1 py-3 rounded-xl border text-sm font-semibold transition hover:opacity-80'
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                Cancelar
              </button>
              <button onClick={processar} disabled={loading || !texto.trim()}
                className='flex-1 py-3 rounded-xl bg-green-500 text-black text-sm font-bold transition disabled:opacity-60 hover:bg-green-400'>
                {loading ? 'Processando...' : 'Extrair Dados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
