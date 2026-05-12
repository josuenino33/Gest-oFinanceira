import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useEffect, useState } from 'react'
import api from '../utils/api'

const menu = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Minha Carteira', path: '/carteira', icon: '💳' },
  { label: 'Resumo Mensal', path: '/resumo', icon: '📋' },
  { label: 'Metas', path: '/metas', icon: '🎯' },
  { label: 'Investimentos', path: '/investimentos', icon: '📈' },
  { label: 'Configurações', path: '/configuracoes', icon: '⚙️' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [saldo, setSaldo] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [showNotif, setShowNotif] = useState(false)

  const carregarDados = () => {
    api.get('/resumo')
      .then(r => setSaldo(r.data.saldo))
      .catch(() => setSaldo(0))
    
    api.get('/notificacoes')
      .then(r => setNotificacoes(r.data))
      .catch(() => setNotificacoes([]))
  }

  useEffect(() => {
    carregarDados()
    const interval = setInterval(carregarDados, 300000) // 5 min
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className='w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] shrink-0 sticky top-0 h-screen flex flex-col transition-colors duration-300'>
      {/* Header */}
      <div className='p-6 pb-4'>
        <div className='flex justify-between items-center mb-2'>
          <h1 className='text-2xl font-bold text-green-400 leading-tight'>Minhas Finanças</h1>
          <div className='flex gap-1'>
            <button 
              onClick={toggleTheme}
              className='p-2 text-lg hover:bg-gray-500/10 rounded-lg transition'
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <div className='relative'>
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className='relative p-2 text-xl hover:bg-gray-500/10 rounded-lg transition'
              >
                🔔
                {notificacoes.length > 0 && (
                  <span className='absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[var(--bg-sidebar)]'>
                    {notificacoes.length}
                  </span>
                )}
              </button>
              
              {showNotif && (
                <>
                  <div className='fixed inset-0 z-40' onClick={() => setShowNotif(false)} />
                  <div className='absolute left-0 mt-2 w-64 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-3 max-h-80 overflow-y-auto'>
                    <h3 className='text-xs font-bold text-gray-500 uppercase mb-3'>Alertas</h3>
                    {notificacoes.length === 0 ? (
                      <p className='text-[var(--text-muted)] text-sm'>Nenhuma pendência próxima.</p>
                    ) : (
                      <div className='space-y-3'>
                        {notificacoes.map((n, i) => (
                          <div key={i} className={`p-2 rounded-lg border-l-4 text-xs ${
                            n.tipo === 'urgente' ? 'bg-red-500/10 border-red-500' : 
                            n.tipo === 'alerta' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-blue-500/10 border-blue-500'
                          }`}>
                            <p className='font-semibold text-[var(--text-main)]'>{n.msg}</p>
                            <p className='text-[var(--text-muted)] mt-1'>R$ {n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <p className='text-[var(--text-muted)] text-xs mt-1'>Controle total da sua vida financeira</p>
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
                  : 'text-[var(--text-main)] opacity-80 hover:opacity-100'
              }`
            }
          >
            <span className='text-base'>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer - sempre visível */}
      <div className='p-4 space-y-3 border-t border-[var(--border-color)]'>
        <div className='bg-[var(--bg-input)] rounded-2xl p-4 border border-[var(--border-color)]'>
          <p className='text-[var(--text-muted)] text-xs'>Saldo disponível</p>
          <h2 className='text-2xl font-bold text-green-400 mt-1'>
            {saldo !== null
              ? `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '...'}
          </h2>
          {user && <p className='text-[var(--text-muted)] text-xs mt-2'>{user.nome}</p>}
        </div>

        <button
          onClick={logout}
          className='w-full rounded-xl bg-[var(--bg-input)] px-4 py-2.5 text-left text-[var(--text-main)] text-sm transition hover:bg-red-500/20 hover:text-red-400 border border-[var(--border-color)]'
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  )
}
