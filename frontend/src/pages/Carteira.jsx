import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Receitas from './Receitas'
import Contas from './Contas'
import Cartoes from './Cartoes'
import ComprasCartao from './ComprasCartao'
import Investimentos from './Investimentos'

export default function Carteira() {
  const location = useLocation()
  const [abaAtiva, setAbaAtiva] = useState('contas')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab) setAbaAtiva(tab)
  }, [location])

  const abas = [
    { id: 'contas', label: 'Contas a Pagar', icon: '💸' },
    { id: 'receitas', label: 'Minhas Receitas', icon: '💰' },
    { id: 'cartoes', label: 'Cartões', icon: '💳' },
    { id: 'compras', label: 'Compras Cartão', icon: '🛒' },
    { id: 'investimentos', label: 'Investimentos', icon: '📈' }
  ]

  return (
    <div className='max-w-7xl mx-auto'>
      <div className='mb-10'>
        <h1 className='text-4xl font-black tracking-tighter' style={{ color: 'var(--text-main)' }}>Minha Carteira</h1>
        <p style={{ color: 'var(--text-muted)' }} className='font-medium'>Gerencie todos os seus lançamentos em um só lugar</p>
      </div>

      <div className='flex overflow-x-auto hide-scrollbar gap-2 p-2 rounded-[2rem] border mb-10' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              abaAtiva === aba.id ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'hover:bg-green-500/10'
            }`}
            style={abaAtiva !== aba.id ? { color: 'var(--text-muted)' } : {}}
          >
            <span className='text-xl'>{aba.icon}</span>
            <span className='whitespace-nowrap'>{aba.label}</span>
          </button>
        ))}
      </div>

      <div>
        {abaAtiva === 'receitas' && <Receitas />}
        {abaAtiva === 'contas' && <Contas />}
        {abaAtiva === 'cartoes' && <Cartoes />}
        {abaAtiva === 'compras' && <ComprasCartao />}
        {abaAtiva === 'investimentos' && <Investimentos />}
      </div>
    </div>
  )
}
