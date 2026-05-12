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
    </div>
  )
}
