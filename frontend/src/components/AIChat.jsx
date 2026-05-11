import { useState, useRef, useEffect } from 'react'
import api from '../utils/api'

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu Consultor de IA. Como posso ajudar com suas finanças hoje?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
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
    <div className='fixed bottom-24 left-6 lg:bottom-10 lg:left-10 z-50'>
      {/* Balão de Chat */}
      {isOpen && (
        <div className='absolute bottom-16 left-0 w-[320px] md:w-[400px] h-[500px] bg-[#0b1728] border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300'>
          {/* Header */}
          <div className='bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex justify-between items-center shadow-lg'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg'>🤖</div>
              <span className='font-bold text-black'>Consultor de IA</span>
            </div>
            <button onClick={() => setIsOpen(false)} className='text-black/60 hover:text-black font-bold'>✕</button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className='flex-1 overflow-y-auto p-4 space-y-4 bg-[#07111f] scroll-smooth'>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-green-500 text-black font-medium rounded-tr-none' 
                    : 'bg-[#111f34] text-gray-200 border border-gray-800 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className='flex justify-start animate-pulse'>
                <div className='bg-[#111f34] p-3 rounded-2xl text-xs text-gray-500'>IA está digitando...</div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className='p-4 bg-[#0b1728] border-t border-gray-800 flex gap-2'>
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Pergunte algo...'
              className='flex-1 bg-[#111f34] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-green-500 transition-all'
            />
            <button 
              type='submit' 
              disabled={loading}
              className='bg-green-500 text-black w-10 h-10 rounded-xl flex items-center justify-center hover:bg-green-400 transition shadow-lg shadow-green-500/20'
            >
              🚀
            </button>
          </form>
        </div>
      )}

      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-red-500 rotate-90' : 'bg-green-500'
        } shadow-green-500/20`}
      >
        {isOpen ? '✕' : '🤖'}
      </button>
    </div>
  )
}
