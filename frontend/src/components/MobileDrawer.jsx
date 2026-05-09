import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menu = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Resumo', path: '/resumo', icon: '📋' },
  { label: 'Receitas', path: '/receitas', icon: '💰' },
  { label: 'Contas a Pagar', path: '/contas', icon: '📄' },
  { label: 'Cartões', path: '/cartoes', icon: '💳' },
  { label: 'Compras no Cartão', path: '/compras-cartao', icon: '🛒' },
  { label: 'Metas', path: '/metas', icon: '🎯' },
  { label: 'Investimentos', path: '/investimentos', icon: '📈' },
  { label: 'Relatórios', path: '/relatorios', icon: '📑' },
  { label: 'Categorias', path: '/categorias', icon: '🏷️' },
  { label: 'Planejamento', path: '/planejamento', icon: '🗓️' },
  { label: 'Configurações', path: '/configuracoes', icon: '⚙️' },
]

export default function MobileDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 lg:hidden'>
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' onClick={onClose} />

      {/* Drawer */}
      <div className='absolute right-0 top-0 bottom-0 w-[280px] bg-[#0b1728] border-l border-gray-800 flex flex-col animate-[slideInRight_0.25s_ease-out]'>
        {/* Header */}
        <div className='p-5 border-b border-gray-800 flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-bold text-green-400'>Menu</h2>
            {user && <p className='text-gray-500 text-xs mt-1'>{user.nome}</p>}
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-white text-2xl leading-none'>✕</button>
        </div>

        {/* Menu items */}
        <nav className='flex-1 overflow-y-auto hide-scrollbar p-3 space-y-1'>
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                  isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span className='text-base'>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className='p-4 border-t border-gray-800'>
          <button
            onClick={() => { logout(); onClose(); }}
            className='w-full rounded-xl bg-red-500/10 px-4 py-3 text-red-400 text-sm transition hover:bg-red-500/20 text-center font-semibold'
          >
            🚪 Sair da Conta
          </button>
        </div>
      </div>
    </div>
  )
}
