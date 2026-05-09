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
      <div className='relative bg-[#0b1728] border border-gray-700 rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-[fadeIn_0.2s_ease-out]'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-bold'>{title}</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white text-2xl leading-none transition'
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
