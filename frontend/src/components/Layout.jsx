import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AIChat from './AIChat'
import MobileDrawer from './MobileDrawer'
import OfflineBanner from './OfflineBanner'
import api from '../utils/api'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const notifChecked = useRef(false)

  // Captura o evento de instalação do PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Só mostra se não foi dispensado antes
      if (!localStorage.getItem('pwa-install-dismissed')) setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    setInstallPrompt(null)
  }

  const dismissInstall = () => {
    setShowInstall(false)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  // Notificações de contas a vencer
  useEffect(() => {
    if (notifChecked.current) return
    notifChecked.current = true
    if (!('Notification' in window)) return

    const checar = async () => {
      try {
        if (Notification.permission === 'default') await Notification.requestPermission()
        if (Notification.permission !== 'granted') return
        const res = await api.get('/notificacoes')
        const urgentes = (res.data || []).filter(n => n.tipo === 'urgente')
        const avisos = (res.data || []).filter(n => n.tipo === 'aviso')
        if (urgentes.length > 0) {
          new Notification('Minhas Finanças — Vence hoje ou está atrasada!', {
            body: urgentes.map(n => n.msg).join('\n'),
            icon: '/favicon.svg',
            tag: 'financas-urgente',
            requireInteraction: true
          })
        } else if (avisos.length > 0) {
          new Notification('Minhas Finanças — Contas próximas do vencimento', {
            body: avisos.map(n => n.msg).join('\n'),
            icon: '/favicon.svg',
            tag: 'financas-aviso'
          })
        }
      } catch {}
    }

    checar()
  }, [])

  return (
    <div className='flex bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen font-sans transition-colors duration-300'>
      <OfflineBanner />

      {/* Banner de instalação do PWA */}
      {showInstall && (
        <div className='fixed bottom-24 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-50 rounded-2xl border shadow-2xl p-4 flex items-center gap-3'
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className='text-3xl'>📱</span>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-bold' style={{ color: 'var(--text-main)' }}>Instalar o app</p>
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Acesse direto da tela inicial, sem navegador</p>
          </div>
          <div className='flex flex-col gap-1'>
            <button onClick={handleInstall}
              className='px-3 py-1 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400'>
              Instalar
            </button>
            <button onClick={dismissInstall}
              className='px-3 py-1 rounded-xl text-xs' style={{ color: 'var(--text-muted)' }}>
              Agora não
            </button>
          </div>
        </div>
      )}

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
        onActionOpen={() => setIsMenuOpen(!isMenuOpen)}
      />

      {/* Mobile: drawer menu */}
      <MobileDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <AIChat isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {/* Botão Flutuante - Apenas Desktop */}
      <div className='fixed bottom-10 right-10 z-50 hidden lg:block'>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 ${
            isMenuOpen ? 'bg-red-500 text-white rotate-45' : 'bg-green-500 text-black hover:scale-110 shadow-green-500/20'
          }`}
        >
          {isMenuOpen ? '✕' : '＋'}
        </button>
      </div>
    </div>
  )
}
