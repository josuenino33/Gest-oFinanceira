import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function AIChat({ isMenuOpen, setIsMenuOpen }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu consultor financeiro inteligente. Como posso te ajudar hoje?' }
  ])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakEnabled, setSpeakEnabled] = useState(false)
  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await api.post('/chat', { message: userMsg })
      const aiText = res.data.response
      setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      if (speakEnabled) speak(aiText)
    } catch (err) {
      const errorMsg = err.response?.data?.response || 'Erro de conexão com o servidor.'
      setMessages(prev => [...prev, { role: 'ai', text: errorMsg }])
    } finally { setLoading(false) }
  }

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.' }])
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const r = new SR()
    r.lang = 'pt-BR'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' : '') + transcript)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    utter.rate = 1.05
    window.speechSynthesis.speak(utter)
  }

  const actionBtnStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <div className='fixed bottom-6 right-4 md:bottom-10 md:right-10 z-50 flex flex-col items-end gap-4 pointer-events-none'>
      {(isMenuOpen || isOpen) && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[-1] pointer-events-auto'
          onClick={() => { setIsMenuOpen(false); setIsOpen(false) }} />
      )}

      {isMenuOpen && !isOpen && (
        <div className='flex flex-col items-end gap-3 mb-2 pointer-events-auto'>
          {[
            { label: 'Novo Ganho', icon: '💰', action: () => { navigate('/carteira?tab=receitas'); setIsMenuOpen(false) } },
            { label: 'Nova Despesa', icon: '💸', action: () => { navigate('/carteira?tab=contas'); setIsMenuOpen(false) } },
            { label: 'Compra no Cartão', icon: '💳', action: () => { navigate('/carteira?tab=compras'); setIsMenuOpen(false) } },
            { label: 'Falar com IA', icon: '🤖', action: () => { setIsOpen(true); setIsMenuOpen(false) } },
          ].map((item, i) => (
            <button key={i} onClick={item.action}
              className='border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 hover:opacity-80 transition-all font-bold text-sm w-max min-w-[220px] justify-between active:scale-95'
              style={actionBtnStyle}>
              {item.label} <span>{item.icon}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className='absolute bottom-16 right-0 w-[90vw] max-w-[340px] md:max-w-[420px] h-[70vh] max-h-[600px] backdrop-blur-2xl border rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden pointer-events-auto'
          style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
          <div className='bg-gradient-to-r from-green-500 to-emerald-600 p-6 flex justify-between items-center shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center text-xl'>🤖</div>
              <div>
                <h3 className='font-black text-black leading-none'>Consultor de IA</h3>
                <span className='text-[10px] text-black/60 font-bold uppercase'>Online Agora</span>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => { setSpeakEnabled(v => !v); window.speechSynthesis?.cancel() }}
                title={speakEnabled ? 'Desativar voz da IA' : 'Ativar voz da IA'}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition ${speakEnabled ? 'bg-black/30' : 'bg-black/10'}`}>
                🔊
              </button>
              <button onClick={() => setIsOpen(false)} className='text-black/60 hover:text-black transition text-2xl'>✕</button>
            </div>
          </div>

          <div ref={scrollRef} className='flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth'>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-green-500 text-black rounded-tr-none'
                    : 'border rounded-tl-none'
                }`} style={m.role !== 'user' ? { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className='flex justify-start'>
                <div className='p-4 rounded-2xl text-xs animate-pulse' style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Digitando...</div>
              </div>
            )}
          </div>

          <div className='p-4 border-t' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {listening && (
              <div className='flex items-center gap-2 mb-3 px-1'>
                <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
                <span className='text-xs font-semibold text-red-500'>Ouvindo... fale agora</span>
              </div>
            )}
            <div className='flex gap-2'>
              <button
                onClick={toggleVoice}
                title={listening ? 'Parar de ouvir' : 'Falar para a IA'}
                className={`p-3 rounded-2xl border transition shrink-0 text-base ${
                  listening
                    ? 'bg-red-500 text-white border-red-500'
                    : 'hover:bg-green-500/10'
                }`}
                style={!listening ? { borderColor: 'var(--border-color)', color: 'var(--text-muted)' } : {}}>
                🎤
              </button>
              <input type='text' value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder='Pergunte algo...'
                className='flex-1 border rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-all'
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              <button onClick={handleSend} disabled={loading}
                className='bg-green-500 hover:bg-green-400 text-black p-3 rounded-2xl transition shadow-lg disabled:opacity-50 shrink-0'>
                🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
