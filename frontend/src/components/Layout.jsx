import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AIChat from './AIChat'
import MobileDrawer from './MobileDrawer'
import QuickAddExpense from './QuickAddExpense'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

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
        onQuickAdd={() => setQuickAddOpen(true)}
      />

      {/* Mobile: drawer menu */}
      <MobileDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Quick add expense (mobile + desktop) */}
      <QuickAddExpense isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <AIChat />

      {/* Desktop: FAB flutuante para saída rápida */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className='hidden lg:flex fixed bottom-8 right-8 w-16 h-16 rounded-full bg-green-500 items-center justify-center text-3xl shadow-lg shadow-green-500/30 hover:bg-green-400 hover:scale-105 transition-all z-30 active:scale-95'
        title='Registrar saída rápida'
      >
        ＋
      </button>
    </div>
  )
}
