import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../utils/api'

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

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [saldo, setSaldo] = useState(null)

  useEffect(() => {
    api.get('/resumo')
      .then(r => setSaldo(r.data.saldo))
      .catch(() => setSaldo(0))
  }, [])

  return (
    <aside className='w-72 bg-[#0b1728] border-r border-gray-800 shrink-0 sticky top-0 h-screen flex flex-col'>
      {/* Header */}
      <div className='p-6 pb-4'>
        <h1 className='text-2xl font-bold text-green-400'>Minha Finanças</h1>
        <p className='text-gray-400 text-sm mt-1'>Controle total da sua vida financeira</p>
      </div>

      {/* Menu - scrollável com scrollbar invisível */}
      <nav className='flex-1 overflow-y-auto hide-scrollbar px-4 space-y-1'>
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-green-500/20 hover:text-green-400 text-sm ${
                isActive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-gray-300'
              }`
            }
          >
            <span className='text-base'>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer - sempre visível */}
      <div className='p-4 space-y-3 border-t border-gray-800/50'>
        <div className='bg-[#111f34] rounded-2xl p-4 border border-gray-700'>
          <p className='text-gray-400 text-xs'>Saldo disponível</p>
          <h2 className='text-2xl font-bold text-green-400 mt-1'>
            {saldo !== null
              ? `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '...'}
          </h2>
          {user && <p className='text-gray-500 text-xs mt-2'>{user.nome}</p>}
        </div>

        <button
          onClick={logout}
          className='w-full rounded-xl bg-[#111f34] px-4 py-2.5 text-left text-gray-300 text-sm transition hover:bg-red-500/20 hover:text-red-400 border border-gray-700'
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  )
}
