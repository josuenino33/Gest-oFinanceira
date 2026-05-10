import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { label: 'Home', path: '/', icon: '📊' },
  { label: 'Receitas', path: '/receitas', icon: '💰' },
  { label: 'Contas', path: '/contas', icon: '📄' },
  { label: 'Metas', path: '/metas', icon: '🎯' },
]

export default function BottomNav({ onMenuOpen, onQuickAdd }) {
  const location = useLocation()

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-[#0b1728]/95 backdrop-blur-xl border-t border-gray-800 lg:hidden'>
      <div className='flex items-center justify-around px-2 py-1 safe-area-bottom'>
        {tabs.slice(0, 2).map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'
            >
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </NavLink>
          )
        })}

        {/* FAB central - Registrar saída */}
        <button
          onClick={onQuickAdd}
          className='flex flex-col items-center -mt-6'
        >
          <div className='w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-transform'>
            ＋
          </div>
          <span className='text-[10px] text-green-400 mt-0.5'>Saída</span>
        </button>

        {tabs.slice(2, 3).map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'
            >
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </NavLink>
          )
        })}

        {/* Menu burger */}
        <button
          onClick={onMenuOpen}
          className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'
        >
          <span className='text-xl'>☰</span>
          <span className='text-[10px] text-gray-400'>Menu</span>
        </button>
      </div>
    </div>
  )
}
