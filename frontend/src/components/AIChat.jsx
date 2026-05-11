import { useState, useRef, useEffect } from 'react'
import api from '../utils/api'

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu consultor financeiro inteligente. Como posso te ajudar hoje?' }
  ])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      if (userMsg.toLowerCase() === '/debug') {
        const res = await api.get('/test-ai')
        setMessages(prev => [...prev, { role: 'ai', text: `DEBUG: Modelos: ${res.data.modelos_disponiveis?.join(', ') || 'Nenhum'}` }])
        return
      }
      const res = await api.post('/chat', { message: userMsg })
      setMessages(prev => [...prev, { role: 'ai', text: res.data.response }])
    } catch (err) {
      console.error(err)
      const errorMsg = err.response?.data?.response || 'Erro de conexão com o servidor. Verifique se o backend está rodando.'
      setMessages(prev => [...prev, { role: 'ai', text: `ERRO: ${errorMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed bottom-10 right-10 z-50 flex flex-col items-end gap-4'>
      {/* Menu de Ações Rápidas */}
      {showMenu && !isOpen && (
        <div className='flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200'>
          <button 
            onClick={() => { window.location.href='/contas'; setShowMenu(false); }}
            className='bg-[#0d1a2d] border border-gray-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 hover:bg-gray-800 transition-all font-bold text-sm'
          >
            <span>💸</span> Nova Despesa
          </button>
          <button 
            onClick={() => { setIsOpen(true); setShowMenu(false); }}
            className='bg-[#0d1a2d] border border-gray-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 hover:bg-gray-800 transition-all font-bold text-sm'
          >
            <span>🤖</span> Falar com IA
          </button>
        </div>
      )}

      {/* Janela de Chat Glassmorphism */}
      {isOpen && (
        <div className='absolute bottom-20 right-0 w-[320px] md:w-[450px] h-[650px] bg-[#0b1728]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500'>
          {/* Header */}
          <div className='bg-gradient-to-r from-green-500 to-emerald-600 p-6 flex justify-between items-center shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center text-xl'>🤖</div>
              <div>
                <h3 className='font-black text-black leading-none'>Consultor de IA</h3>
                <span className='text-[10px] text-black/60 font-bold uppercase'>Online Agora</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className='text-black/60 hover:text-black transition text-2xl'>✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className='flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth'>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-green-500 text-black rounded-tr-none' 
                    : 'bg-[#15253d] text-gray-200 border border-white/5 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className='flex justify-start'>
                <div className='bg-[#15253d] p-4 rounded-2xl text-gray-400 text-xs animate-pulse'>Digitando...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className='p-6 bg-[#0d1a2d] border-t border-gray-800'>
            <div className='flex gap-2'>
              <input
                type='text'
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder='Pergunte algo...'
                className='flex-1 bg-[#15253d] border border-gray-700 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-green-500 transition-all'
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className='bg-green-500 hover:bg-green-400 text-black p-4 rounded-2xl transition shadow-lg shadow-green-500/20 disabled:opacity-50'
              >
                🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Principal */}
      <button
        onClick={() => {
          if (isOpen) setIsOpen(false)
          else setShowMenu(!showMenu)
        }}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${
          showMenu || isOpen ? 'bg-red-500 text-white rotate-45' : 'bg-green-500 text-black hover:scale-110 shadow-green-500/20'
        }`}
      >
        {showMenu || isOpen ? '✕' : '+'}
      </button>
    </div>
  )
}
