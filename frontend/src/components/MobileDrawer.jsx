import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menu = [
  { label: 'Dashboard',      path: '/',              icon: '📊' },
  { label: 'Minha Carteira', path: '/carteira',      icon: '💼' },
  { label: 'Orçamentos',     path: '/orcamentos',    icon: '🎯' },
  { label: 'Desafios',       path: '/desafios',      icon: '🏅' },
  { label: 'Metas & Sonhos', path: '/metas',         icon: '⭐' },
  { label: 'Recorrências',   path: '/recorrencias',  icon: '🔄' },
  { label: 'Investimentos',  path: '/investimentos', icon: '📈' },
  { label: 'Categorias',     path: '/categorias',    icon: '🏷️' },
  { label: 'Relatórios',     path: '/relatorios',    icon: '📋' },
  { label: 'Configurações',  path: '/configuracoes', icon: '⚙️' },
]

export default function MobileDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 lg:hidden'>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose} />
      <div className='absolute right-0 top-0 bottom-0 w-[280px] border-l flex flex-col animate-[slideInRight_0.25s_ease-out]' style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
        <div className='p-5 border-b flex items-center justify-between' style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className='text-lg font-bold text-green-500'>Menu</h2>
            {user && <p style={{ color: 'var(--text-muted)' }} className='text-xs mt-1'>{user.nome}</p>}
          </div>
          <button onClick={onClose} className='text-2xl leading-none' style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <nav className='flex-1 overflow-y-auto hide-scrollbar p-3 space-y-1'>
          {menu.map((item) => (
            <NavLink
              key={item.path} to={item.path} end={item.path === '/'} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                  isActive ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'hover:bg-green-500/10'
                }`
              }
              style={({ isActive }) => !isActive ? { color: 'var(--text-main)' } : {}}
            >
              <span className='text-base'>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className='p-4 border-t' style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={() => { logout(); onClose(); }}
            className='w-full rounded-xl bg-red-500/10 px-4 py-3 text-red-500 text-sm transition hover:bg-red-500/20 text-center font-semibold'>
            🚪 Sair da Conta
          </button>
        </div>
      </div>
    </div>
  )
}
