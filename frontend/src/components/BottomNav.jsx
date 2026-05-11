import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { label: 'Home', path: '/', icon: '📊' },
  { label: 'Carteira', path: '/carteira', icon: '💳' },
  { label: 'Resumo', path: '/resumo', icon: '📋' },
  { label: 'Metas', path: '/metas', icon: '🎯' },
]

export default function BottomNav({ onMenuOpen }) {
  const location = useLocation()

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-sidebar)]/95 backdrop-blur-xl border-t border-[var(--border-color)] lg:hidden'>
      <div className='flex items-center justify-around px-2 py-1 safe-area-bottom'>
        {tabs.map((tab) => {
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
