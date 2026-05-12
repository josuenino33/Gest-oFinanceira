import { NavLink, useLocation } from 'react-router-dom'

export default function BottomNav({ onMenuOpen, onActionOpen }) {
  const location = useLocation()

  const tabsLeft = [
    { label: 'Home', path: '/', icon: '📊' },
    { label: 'Carteira', path: '/carteira', icon: '💳' },
  ]

  const tabsRight = [
    { label: 'Metas', path: '/metas', icon: '🎯' },
  ]

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-[#0d1a2d]/95 backdrop-blur-xl border-t border-gray-800 lg:hidden'>
      <div className='flex items-center justify-around px-2 py-1 safe-area-bottom h-16'>
        
        {/* Lado Esquerdo */}
        {tabsLeft.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'
            >
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-400 font-bold' : 'text-gray-400 font-medium'}`}>
                {tab.label}
              </span>
            </NavLink>
          )
        })}

        {/* Botão Central (+) */}
        <div className='relative -mt-10'>
          <button
            onClick={onActionOpen}
            className='w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-3xl text-black shadow-lg shadow-green-500/40 active:scale-90 transition-all border-4 border-[#0d1a2d]'
          >
            ＋
          </button>
        </div>

        {/* Lado Direito */}
        {tabsRight.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'
            >
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-400 font-bold' : 'text-gray-400 font-medium'}`}>
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
          <span className='text-xl text-gray-400'>☰</span>
          <span className='text-[10px] text-gray-400 font-medium'>Menu</span>
        </button>
      </div>
    </div>
  )
}
