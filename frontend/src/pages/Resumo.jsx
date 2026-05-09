import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

export default function Resumo() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    api.get('/resumo').then(r => setSummary(r.data)).catch(() => {})
  }, [])

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const chartData = [
    { name: 'Jan', valor: 4200 }, { name: 'Fev', valor: 5500 },
    { name: 'Mar', valor: 7000 }, { name: 'Abr', valor: 6000 },
    { name: 'Mai', valor: 7850 }, { name: 'Jun', valor: 6500 },
  ]

  return (
    <Layout>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold'>Resumo Financeiro</h1>
        <p className='text-gray-400 mt-2'>Visão consolidada das suas finanças</p>
      </div>

      {summary && (
        <>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            {[
              { label: 'Total de Receitas', value: fmt(summary.receitas), color: 'text-green-400' },
              { label: 'Total de Despesas', value: fmt(summary.despesas), color: 'text-red-400' },
              { label: 'Saldo Líquido', value: fmt(summary.saldo), color: summary.saldo >= 0 ? 'text-blue-400' : 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
                <p className='text-gray-400 text-sm uppercase tracking-wider'>{item.label}</p>
                <h2 className={`text-3xl font-bold mt-3 ${item.color}`}>{item.value}</h2>
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8'>
            <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
              <h2 className='text-2xl font-bold mb-6'>Evolução Mensal</h2>
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id='colorResumo' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#34d399' stopOpacity={0.8} />
                        <stop offset='95%' stopColor='#34d399' stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke='#1f2b42' vertical={false} />
                    <XAxis dataKey='name' stroke='#829ab1' />
                    <YAxis stroke='#829ab1' />
                    <Tooltip contentStyle={{ background: '#0b1728', border: '1px solid #334155', borderRadius: '12px' }} formatter={(v) => fmt(v)} />
                    <Area type='monotone' dataKey='valor' stroke='#34d399' fill='url(#colorResumo)' />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
              <h2 className='text-2xl font-bold mb-6'>Indicadores</h2>
              <div className='space-y-6'>
                <div className='bg-[#132238] rounded-xl p-5'>
                  <p className='text-gray-400 text-sm'>Taxa de Economia</p>
                  <p className='text-2xl font-bold text-green-400 mt-2'>
                    {summary.receitas > 0 ? Math.round((summary.saldo / summary.receitas) * 100) : 0}%
                  </p>
                  <div className='w-full h-3 bg-[#15253d] rounded-full overflow-hidden mt-3'>
                    <div className='h-full bg-gradient-to-r from-green-400 to-emerald-500' style={{ width: `${summary.receitas > 0 ? Math.round((summary.saldo / summary.receitas) * 100) : 0}%` }} />
                  </div>
                </div>
                <div className='bg-[#132238] rounded-xl p-5'>
                  <p className='text-gray-400 text-sm'>Progresso Médio das Metas</p>
                  <p className='text-2xl font-bold text-purple-400 mt-2'>{Math.round(summary.meta)}%</p>
                  <div className='w-full h-3 bg-[#15253d] rounded-full overflow-hidden mt-3'>
                    <div className='h-full bg-gradient-to-r from-purple-400 to-blue-500' style={{ width: `${summary.meta}%` }} />
                  </div>
                </div>
                <div className='bg-[#132238] rounded-xl p-5'>
                  <p className='text-gray-400 text-sm'>Comprometimento da Renda</p>
                  <p className='text-2xl font-bold text-yellow-400 mt-2'>
                    {summary.receitas > 0 ? Math.round((summary.despesas / summary.receitas) * 100) : 0}%
                  </p>
                  <div className='w-full h-3 bg-[#15253d] rounded-full overflow-hidden mt-3'>
                    <div className='h-full bg-gradient-to-r from-yellow-400 to-red-500' style={{ width: `${summary.receitas > 0 ? Math.round((summary.despesas / summary.receitas) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
