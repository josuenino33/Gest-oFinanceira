import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Receitas from './Receitas'
import Contas from './Contas'
import Cartoes from './Cartoes'
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
    { id: 'cartoes', label: 'Cartões & Compras', icon: '💳' },
    { id: 'investimentos', label: 'Investimentos', icon: '📈' }
  ]

  return (
    <div className='max-w-7xl mx-auto'>
      <div className='mb-10'>
        <h1 className='text-4xl font-black text-white tracking-tighter'>Minha Carteira</h1>
        <p className='text-gray-500 font-medium'>Gerencie todos os seus lançamentos em um só lugar</p>
      </div>

      {/* Navegação Interna - Ajustada para Mobile */}
      <div className='flex flex-wrap md:flex-nowrap gap-2 bg-[#0d1a2d] p-2 rounded-[2rem] border border-gray-800 mb-10'>
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
              abaAtiva === aba.id ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className='text-lg md:text-xl'>{aba.icon}</span> 
            <span>{aba.label}</span>
          </button>
        ))}
      </div>

      {/* Renderização Condicional das Páginas Existentes */}
      <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
        {abaAtiva === 'receitas' && <Receitas />}
        {abaAtiva === 'contas' && <Contas />}
        {abaAtiva === 'cartoes' && <Cartoes />}
        {abaAtiva === 'investimentos' && <Investimentos />}
      </div>
    </div>
  )
}
