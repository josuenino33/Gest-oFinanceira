import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AIChat from './AIChat'
import MobileDrawer from './MobileDrawer'
import QuickAddExpense from './QuickAddExpense'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className='flex bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen font-sans transition-colors duration-300'>
      {/* Sidebar - apenas desktop */}
      <div className='hidden lg:block'>
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <main className='flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8'>
        <Outlet />
      </main>

      {/* Mobile: bottom nav */}
      <BottomNav
        onMenuOpen={() => setMenuOpen(true)}
        onActionOpen={() => setIsMenuOpen(!isMenuOpen)}
      />

      {/* Mobile: drawer menu */}
      <MobileDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <AIChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {/* Botão Flutuante - Apenas Desktop */}
      <div className='fixed bottom-10 right-10 z-50 hidden lg:block'>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${
            isMenuOpen ? 'bg-red-500 text-white rotate-45' : 'bg-green-500 text-black hover:scale-110 shadow-green-500/20'
          }`}
        >
          {isMenuOpen ? '✕' : '＋'}
        </button>
      </div>
    </div>
  )
}
