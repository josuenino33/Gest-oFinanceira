import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function getValidToken() {
  const token = localStorage.getItem('finance-dashboard-token')
  const refresh = localStorage.getItem('finance-dashboard-refresh')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (Date.now() < payload.exp * 1000 - 60000) return token
    if (!refresh) return null
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refresh}` }
    })
    if (!res.ok) { window.location.href = '/login'; return null }
    const data = await res.json()
    localStorage.setItem('finance-dashboard-token', data.access_token)
    localStorage.setItem('finance-dashboard-refresh', data.refresh_token)
    return data.access_token
  } catch { return token }
}

async function streamChat(msg, onChunk, onDone, onError) {
  const token = await getValidToken()
  if (!token) { onError(); return }
  let res
  try {
    res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: msg }),
    })
  } catch {
    onError(); return
  }
  if (!res.ok) { onError(); return }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') { onDone(); return }
      if (data.startsWith('[ERROR]')) { onError(); return }
      onChunk(data.replace(/\\n/g, '\n'))
    }
  }
  onDone()
}

export default function AIChat({ isMenuOpen, setIsMenuOpen }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou seu consultor financeiro inteligente. Como posso te ajudar hoje?' }
  ])
  const [loading, setLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [voiceState, setVoiceState] = useState('idle') // idle | listening | processing | speaking
  const [liveTranscript, setLiveTranscript] = useState('')
  const [useBrowserTTS, setUseBrowserTTS] = useState(true)

  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)
  const voiceModeRef = useRef(false)
  const finalTranscriptRef = useRef('')
  // actionRef holds latest function versions — avoids stale closures in recognition callbacks
  const actionRef = useRef({})

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, liveTranscript])

  // Stop everything when chat is closed
  useEffect(() => {
    if (!isOpen) { if (voiceMode) stopVoiceMode() }
  }, [isOpen])

  // Remove markdown e formata para soar natural no TTS
  const cleanForSpeech = (text) => text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/gs, '$1')
    .replace(/R\$\s?([\d.,]+)/g, (_, n) => n.replace(/\./g, '').replace(',', ' reais e ') + ' centavos')
    .replace(/(\d+)%/g, '$1 por cento')
    .replace(/(\d)\.(\d{3})/g, '$1$2')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const speakBrowser = (text, onEnd) => {
    if (!window.speechSynthesis) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const preferred = [
      'Microsoft Francisca Online (Natural) - Portuguese (Brazil)',
      'Microsoft Luciana Online (Natural) - Portuguese (Brazil)',
      'Google português do Brasil',
      'Microsoft Maria - Portuguese (Brazil)',
      'Luciana', 'Francisca',
    ]
    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'pt-BR'
      utter.rate = 1.05
      utter.pitch = 1.0
      const voices = window.speechSynthesis.getVoices()
      const best = preferred.map(n => voices.find(v => v.name === n)).find(Boolean)
        || voices.find(v => v.lang?.startsWith('pt-BR') && !v.localService)
        || voices.find(v => v.lang?.startsWith('pt-BR'))
        || voices.find(v => v.lang?.startsWith('pt-PT') && !v.localService)
        || voices.find(v => v.lang?.startsWith('pt-PT'))
        || voices.find(v => v.lang?.startsWith('pt'))
      if (best) utter.voice = best
      utter.onend = () => onEnd?.()
      utter.onerror = () => onEnd?.()
      window.speechSynthesis.speak(utter)
    }
    if (window.speechSynthesis.getVoices().length > 0) doSpeak()
    else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak() } }
  }

  const speak = (text, onEnd) => {
    const clean = cleanForSpeech(text)
    if (useBrowserTTS) { speakBrowser(clean, onEnd); return }
    api.post('/tts', { text: clean }, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data)
        const audio = new Audio(url)
        audio.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
        audio.onerror  = () => { URL.revokeObjectURL(url); speakBrowser(clean, onEnd) }
        audio.play().catch(() => { URL.revokeObjectURL(url); speakBrowser(clean, onEnd) })
      })
      .catch(() => speakBrowser(clean, onEnd))
  }

  // Defined via ref so recognition callbacks always call the latest version
  actionRef.current.startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || !voiceModeRef.current) return
    recognitionRef.current?.abort()
    finalTranscriptRef.current = ''

    const r = new SR()
    r.lang = 'pt-BR'
    r.continuous = false
    r.interimResults = true

    r.onstart = () => setVoiceState('listening')

    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscriptRef.current += t
        else interim += t
      }
      setLiveTranscript(finalTranscriptRef.current + interim)
    }

    r.onend = () => {
      const text = finalTranscriptRef.current.trim()
      finalTranscriptRef.current = ''
      setLiveTranscript('')
      if (text) {
        actionRef.current.sendVoiceMessage(text)
      } else if (voiceModeRef.current) {
        setTimeout(() => actionRef.current.startListening(), 600)
      } else {
        setVoiceState('idle')
      }
    }

    r.onerror = (e) => {
      if (e.error === 'aborted') return
      if (voiceModeRef.current) setTimeout(() => actionRef.current.startListening(), 800)
      else setVoiceState('idle')
    }

    recognitionRef.current = r
    try { r.start() } catch {}
  }

  actionRef.current.sendVoiceMessage = async (text) => {
    setVoiceState('processing')
    setMessages(prev => [...prev, { role: 'user', text }, { role: 'ai', text: '' }])

    let full = ''
    let buf = ''
    const queue = []
    let busy = false
    let streamDone = false

    const next = () => {
      if (busy || queue.length === 0) {
        if (streamDone && !busy && queue.length === 0) {
          if (voiceModeRef.current) setTimeout(() => actionRef.current.startListening(), 200)
          else setVoiceState('idle')
        }
        return
      }
      busy = true
      setVoiceState('speaking')
      speak(queue.shift(), () => { busy = false; next() })
    }

    const flush = (force = false) => {
      let end = Math.max(buf.lastIndexOf('.'), buf.lastIndexOf('!'), buf.lastIndexOf('?'))
      if (end >= 8) {
        queue.push(buf.slice(0, end + 1).trim())
        buf = buf.slice(end + 1).trimStart()
      } else {
        // fala em vírgula quando o segmento já é longo o suficiente
        const commaEnd = buf.lastIndexOf(',')
        if (commaEnd >= 20) {
          queue.push(buf.slice(0, commaEnd + 1).trim())
          buf = buf.slice(commaEnd + 1).trimStart()
        } else if (force && buf.trim()) {
          queue.push(buf.trim())
          buf = ''
        }
      }
      next()
    }

    await streamChat(
      text,
      (chunk) => {
        full += chunk
        buf += chunk
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'ai', text: full }
          return msgs
        })
        flush()
      },
      () => {
        streamDone = true
        flush(true)
        next()
      },
      () => {
        streamDone = true
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'ai', text: 'Erro de conexão com o servidor.' }
          return msgs
        })
        if (voiceModeRef.current) setTimeout(() => actionRef.current.startListening(), 1000)
        else setVoiceState('idle')
      }
    )
  }

  const stopVoiceMode = () => {
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    voiceModeRef.current = false
    setVoiceMode(false)
    setVoiceState('idle')
    setLiveTranscript('')
  }

  const startVoiceMode = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Modo voz não suportado neste navegador. Use Chrome ou Edge.' }])
      return
    }
    voiceModeRef.current = true
    setVoiceMode(true)
    setTimeout(() => actionRef.current.startListening(), 150)
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: '' }])
    setLoading(true)
    let full = ''
    await streamChat(
      userMsg,
      (chunk) => {
        full += chunk
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'ai', text: full }
          return msgs
        })
      },
      () => setLoading(false),
      () => {
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'ai', text: 'Erro de conexão.' }
          return msgs
        })
        setLoading(false)
      }
    )
  }

  const voiceLabel = { listening: 'Ouvindo...', processing: 'Processando...', speaking: 'Respondendo...' }
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

          {/* Header */}
          <div className='bg-gradient-to-r from-green-500 to-emerald-600 p-5 flex justify-between items-center shadow-lg shrink-0 relative'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center text-xl'>🤖</div>
              <div>
                <h3 className='font-black text-black leading-none'>Consultor de IA</h3>
                <span className='text-[10px] text-black/60 font-bold uppercase tracking-wider'>
                  {voiceMode ? '🎙️ Modo Voz Ativo' : 'Online Agora'}
                </span>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setUseBrowserTTS(v => !v)}
                className={`text-xs font-black px-2 py-1 rounded-lg transition ${useBrowserTTS ? 'bg-black/30 text-black' : 'bg-black/10 text-black/50'}`}
                title={useBrowserTTS ? 'Usando voz do navegador' : 'Usando voz da IA'}>
                {useBrowserTTS ? '🌐 Navegador' : '🤖 IA'}
              </button>
              <button onClick={() => setIsOpen(false)} className='text-black/60 hover:text-black transition text-2xl leading-none'>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className='flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth'>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                  m.role === 'user' ? 'bg-green-500 text-black rounded-tr-none' : 'border rounded-tl-none'
                }`} style={m.role !== 'user' ? { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && !voiceMode && (
              <div className='flex justify-start'>
                <div className='p-4 rounded-2xl text-xs animate-pulse' style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>Digitando...</div>
              </div>
            )}
          </div>

          {/* Voice Mode Panel */}
          {voiceMode ? (
            <div className='shrink-0 border-t flex flex-col items-center py-6 px-4 gap-3'
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>

              {/* Animated indicator */}
              <div className='relative flex items-center justify-center w-24 h-24'>
                {voiceState === 'listening' && (
                  <>
                    <span className='absolute inset-0 rounded-full bg-green-500/25 animate-ping' />
                    <span className='absolute inset-3 rounded-full bg-green-500/20 animate-ping' style={{ animationDelay: '0.2s' }} />
                  </>
                )}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all ${
                  voiceState === 'listening' ? 'bg-green-500 scale-110' :
                  voiceState === 'speaking'  ? 'bg-blue-500 animate-pulse' :
                  'bg-orange-400 animate-pulse'
                }`}>
                  {voiceState === 'listening' ? '🎤' : voiceState === 'speaking' ? '🔊' : '⏳'}
                </div>
              </div>

              <p className='font-bold text-sm' style={{ color: 'var(--text-main)' }}>
                {voiceLabel[voiceState] || 'Aguardando...'}
              </p>

              {liveTranscript ? (
                <p className='text-xs italic text-center px-4 max-w-[260px]' style={{ color: 'var(--text-muted)' }}>
                  "{liveTranscript}"
                </p>
              ) : (
                voiceState === 'listening' && (
                  <p className='text-xs text-center' style={{ color: 'var(--text-muted)' }}>
                    Fale agora — envio automático ao terminar
                  </p>
                )
              )}

              <button onClick={stopVoiceMode}
                className='mt-1 px-6 py-2 rounded-xl border text-red-500 border-red-500/30 text-sm font-semibold hover:bg-red-500/10 transition'>
                Parar Conversa
              </button>
            </div>
          ) : (
            /* Text input + voice button */
            <div className='p-4 border-t shrink-0' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <button onClick={startVoiceMode}
                className='w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-2xl border font-semibold text-sm text-green-500 border-green-500/40 hover:bg-green-500/10 active:scale-95 transition'>
                🎙️ Iniciar Conversa de Voz
              </button>
              <div className='flex gap-2'>
                <input type='text' value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder='Ou escreva aqui...'
                  className='flex-1 border rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-500 transition'
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <button onClick={handleSend} disabled={loading}
                  className='bg-green-500 hover:bg-green-400 text-black p-3 rounded-2xl transition shadow-lg disabled:opacity-50 shrink-0'>
                  🚀
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
