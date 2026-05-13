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
    <div className='fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t lg:hidden' style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
      <div className='flex items-center justify-around px-2 py-1 safe-area-bottom h-16'>
        {tabsLeft.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink key={tab.path} to={tab.path} className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'>
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-500 font-bold' : ''}`} style={!isActive ? { color: 'var(--text-muted)' } : {}}>{tab.label}</span>
            </NavLink>
          )
        })}

        <div className='relative -mt-10'>
          <button onClick={onActionOpen} className='w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-3xl text-black shadow-lg shadow-green-500/40 active:scale-90 transition-all border-4' style={{ borderColor: 'var(--bg-sidebar)' }}>
            ＋
          </button>
        </div>

        {tabsRight.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink key={tab.path} to={tab.path} className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'>
              <span className='text-xl'>{tab.icon}</span>
              <span className={`text-[10px] ${isActive ? 'text-green-500 font-bold' : ''}`} style={!isActive ? { color: 'var(--text-muted)' } : {}}>{tab.label}</span>
            </NavLink>
          )
        })}

        <button onClick={onMenuOpen} className='flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px]'>
          <span className='text-xl' style={{ color: 'var(--text-muted)' }}>☰</span>
          <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>Menu</span>
        </button>
      </div>
    </div>
  )
}
