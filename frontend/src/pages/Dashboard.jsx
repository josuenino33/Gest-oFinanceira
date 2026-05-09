import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const chartDataDemo = mesesLabel.map((m, i) => ({
  name: m,
  receitas: [4200, 5500, 7000, 6000, 8000, 6500, 9000, 8500, 7800, 6800, 8800, 7850][i],
  despesas: [3200, 4100, 4800, 4200, 5200, 4800, 5800, 5500, 5000, 4600, 5600, 4385][i],
}))

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth())
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear())

  useEffect(() => {
    api.get('/resumo-mensal')
      .then(r => setData(r.data))
      .catch(() => setData({
        receitas: 7850, despesas: 4385.40, saldo: 3464.60, meta_economia: 35,
        categorias: [
          { nome: 'Moradia', percentual: 32 },
          { nome: 'Alimentação', percentual: 18 },
          { nome: 'Transporte', percentual: 15 },
          { nome: 'Lazer', percentual: 11 },
          { nome: 'Saúde', percentual: 9 },
        ],
        contas_pagar: [
          { descricao: 'Aluguel', valor: 1200 },
          { descricao: 'Conta de Luz', valor: 250 },
          { descricao: 'Internet', valor: 120 },
          { descricao: 'Academia', valor: 89.90 },
        ],
        compras_cartao: [
          { descricao: 'Supermercado', parcelas: '1x', valor: 350 },
          { descricao: 'Notebook', parcelas: '10x', valor: 4500 },
          { descricao: 'Viagem', parcelas: '12x', valor: 2200 },
          { descricao: 'Celular', parcelas: '8x', valor: 3000 },
        ],
        metas: [
          { titulo: 'Reserva de Emergência', progresso: 42 },
          { titulo: 'Viagem Internacional', progresso: 39 },
          { titulo: 'Entrada do Imóvel', progresso: 24 },
        ],
      }))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const cards = data ? [
    { titulo: 'Receitas no mês', valor: fmt(data.receitas), cor: 'bg-green-500' },
    { titulo: 'Despesas no mês', valor: fmt(data.despesas), cor: 'bg-red-500' },
    { titulo: 'Saldo do mês', valor: fmt(data.saldo), cor: 'bg-blue-500' },
    { titulo: 'Meta de economia', valor: `${Math.round(data.meta_economia)}%`, cor: 'bg-purple-500' },
  ] : []

  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center h-96'>
          <div className='text-gray-400 text-xl animate-pulse'>Carregando dashboard...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Dashboard</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Visão geral da sua gestão financeira</p>
        </div>
        <div className='flex gap-2'>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className='bg-[#111f34] border border-gray-700 px-3 py-2 md:px-4 md:py-3 rounded-xl hover:bg-[#182840] transition text-white cursor-pointer outline-none focus:border-green-500/50 text-sm'
          >
            {mesesNomes.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className='bg-[#111f34] border border-gray-700 px-3 py-2 md:px-4 md:py-3 rounded-xl hover:bg-[#182840] transition text-white cursor-pointer outline-none focus:border-green-500/50 text-sm'
          >
            {[2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className='grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8'>
        {cards.map((card, i) => (
          <div key={i} className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800 shadow-lg hover:border-gray-600 transition-all duration-300'>
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl ${card.cor} mb-3 md:mb-5 flex items-center justify-center text-xl md:text-2xl`}>
              {['💰', '💸', '📊', '🎯'][i]}
            </div>
            <p className='text-gray-400 text-xs md:text-base'>{card.titulo}</p>
            <h2 className='text-xl md:text-3xl font-bold mt-1 md:mt-2'>{card.valor}</h2>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8'>
        <div className='xl:col-span-2 bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-lg md:text-2xl font-bold'>Receitas x Despesas</h2>
            <select className='bg-[#132238] border border-gray-700 rounded-lg px-3 py-1 md:px-4 md:py-2 text-white text-sm'>
              <option>12 meses</option>
              <option>6 meses</option>
            </select>
          </div>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartDataDemo} barGap={4}>
                <CartesianGrid stroke='#1f2b42' vertical={false} />
                <XAxis dataKey='name' stroke='#829ab1' />
                <YAxis stroke='#829ab1' />
                <Tooltip
                  contentStyle={{ background: '#0b1728', border: '1px solid #334155', borderRadius: '12px' }}
                  formatter={(value) => fmt(value)}
                />
                <Bar dataKey='receitas' fill='#22c55e' radius={[6, 6, 0, 0]} name='Receitas' />
                <Bar dataKey='despesas' fill='#ef4444' radius={[6, 6, 0, 0]} name='Despesas' />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Despesas por Categoria</h2>
          <div className='space-y-5'>
            {(data?.categorias || []).map((cat, i) => (
              <div key={i}>
                <div className='flex justify-between mb-2'>
                  <span>{cat.nome}</span>
                  <span>{cat.percentual}%</span>
                </div>
                <div className='w-full h-3 bg-[#15253d] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-700'
                    style={{ width: `${cat.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8'>
        {/* Contas a Pagar */}
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Contas a Pagar</h2>
          <div className='space-y-4'>
            {(data?.contas_pagar || []).map((conta, i) => (
              <div key={i} className='flex justify-between items-center bg-[#132238] p-4 rounded-xl'>
                <span>{conta.descricao}</span>
                <span className='text-yellow-400 font-semibold'>{fmt(conta.valor)}</span>
              </div>
            ))}
            {(!data?.contas_pagar || data.contas_pagar.length === 0) && (
              <p className='text-gray-500'>Nenhuma conta pendente</p>
            )}
          </div>
        </div>

        {/* Compras no Cartão */}
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Compras no Cartão</h2>
          <div className='overflow-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='text-gray-400 border-b border-gray-700'>
                  <th className='pb-3'>Compra</th>
                  <th className='pb-3'>Parcelas</th>
                  <th className='pb-3'>Valor</th>
                </tr>
              </thead>
              <tbody>
                {(data?.compras_cartao || []).map((c, i) => (
                  <tr key={i} className='border-b border-gray-800'>
                    <td className='py-4'>{c.descricao}</td>
                    <td>{c.parcelas}</td>
                    <td className='text-green-400'>{fmt(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metas */}
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Minhas Metas</h2>
          <div className='space-y-6'>
            {(data?.metas || []).map((meta, i) => (
              <div key={i}>
                <div className='flex justify-between mb-2'>
                  <span>{meta.titulo}</span>
                  <span className='text-green-400'>{meta.progresso}%</span>
                </div>
                <div className='w-full h-4 bg-[#15253d] rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-green-500 transition-all duration-700'
                    style={{ width: `${meta.progresso}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className='mt-10 text-center text-gray-500 text-sm'>
        Dashboard Financeiro Pessoal • Desenvolvido em React + TailwindCSS
      </footer>
    </Layout>
  )
}
