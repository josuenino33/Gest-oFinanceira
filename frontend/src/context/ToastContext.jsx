import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className='fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none' style={{ maxWidth: '360px' }}>
        {toasts.map(t => (
          <div key={t.id} className='pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-[slideInRight_0.25s_ease-out]'
            style={{
              background: t.type === 'error' ? '#1a0a0a' : t.type === 'warning' ? '#1a1400' : t.type === 'info' ? '#0a0f1a' : '#0a1a0e',
              borderColor: t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : t.type === 'info' ? '#3b82f6' : '#22c55e',
              color: '#f8fafc',
            }}>
            <span className='text-xl shrink-0 mt-0.5'>
              {t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✅'}
            </span>
            <p className='text-sm font-semibold leading-relaxed flex-1'>{t.message}</p>
            <button onClick={() => removeToast(t.id)} className='text-gray-500 hover:text-white transition text-lg leading-none shrink-0'>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.addToast
}
