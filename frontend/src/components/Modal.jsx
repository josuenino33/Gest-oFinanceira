import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose} />
      <div className='relative border rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]' style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
        <div className='flex items-center justify-between p-8 pb-4 shrink-0'>
          <h2 className='text-2xl font-bold' style={{ color: 'var(--text-main)' }}>{title}</h2>
          <button
            onClick={onClose}
            className='hover:text-red-400 text-2xl leading-none transition'
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <div className='overflow-y-auto px-8 pb-8 flex-1' style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
