import { useEffect, useState } from 'react'
import api from '../utils/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Resumo() {
  const [summary, setSummary] = useState(null)
  useEffect(() => { api.get('/resumo').then(r => setSummary(r.data)).catch(() => {}) }, [])

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const chartData = [
    { name: 'Jan', valor: 4200 }, { name: 'Fev', valor: 5500 },
    { name: 'Mar', valor: 7000 }, { name: 'Abr', valor: 6000 },
    { name: 'Mai', valor: 7850 }, { name: 'Jun', valor: 6500 },
  ]

  return (
    <>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Resumo Financeiro</h1>
        <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Visão consolidada das suas finanças</p>
      </div>

      {summary && (
        <>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            {[
              { label: 'Total de Receitas', value: fmt(summary.receitas), color: 'text-green-500' },
              { label: 'Total de Despesas', value: fmt(summary.despesas), color: 'text-red-500' },
              { label: 'Saldo Líquido', value: fmt(summary.saldo), color: summary.saldo >= 0 ? 'text-blue-500' : 'text-red-500' },
            ].map((item, i) => (
              <div key={i} className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p style={{ color: 'var(--text-muted)' }} className='text-sm uppercase tracking-wider'>{item.label}</p>
                <h2 className={`text-3xl font-bold mt-3 ${item.color}`}>{item.value}</h2>
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8'>
            <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Evolução Mensal</h2>
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id='colorResumo' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#34d399' stopOpacity={0.8} />
                        <stop offset='95%' stopColor='#34d399' stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke='var(--border-color)' vertical={false} />
                    <XAxis dataKey='name' stroke='var(--text-muted)' />
                    <YAxis stroke='var(--text-muted)' />
                    <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} formatter={(v) => fmt(v)} />
                    <Area type='monotone' dataKey='valor' stroke='#34d399' fill='url(#colorResumo)' />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Indicadores</h2>
              <div className='space-y-6'>
                {[
                  { label: 'Taxa de Economia', value: `${summary.receitas > 0 ? Math.round((summary.saldo / summary.receitas) * 100) : 0}%`, color: 'text-green-500', gradient: 'from-green-400 to-emerald-500', pct: summary.receitas > 0 ? Math.round((summary.saldo / summary.receitas) * 100) : 0 },
                  { label: 'Progresso Médio das Metas', value: `${Math.round(summary.meta)}%`, color: 'text-purple-500', gradient: 'from-purple-400 to-blue-500', pct: summary.meta },
                  { label: 'Comprometimento da Renda', value: `${summary.receitas > 0 ? Math.round((summary.despesas / summary.receitas) * 100) : 0}%`, color: 'text-yellow-500', gradient: 'from-yellow-400 to-red-500', pct: summary.receitas > 0 ? Math.round((summary.despesas / summary.receitas) * 100) : 0 },
                ].map((item, i) => (
                  <div key={i} className='rounded-xl p-5' style={{ background: 'var(--bg-input)' }}>
                    <p style={{ color: 'var(--text-muted)' }} className='text-sm'>{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color} mt-2`}>{item.value}</p>
                    <div className='w-full h-3 rounded-full overflow-hidden mt-3' style={{ background: 'var(--border-color)' }}>
                      <div className={`h-full bg-gradient-to-r ${item.gradient}`} style={{ width: `${Math.max(0, Math.min(100, item.pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
