import { useEffect, useState } from 'react'
import api from '../utils/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899']

export default function Relatorios() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/relatorios').then(r => setData(r.data)).catch(console.error) }, [])

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (!data) return <div className='flex items-center justify-center h-96'><p style={{ color: 'var(--text-muted)' }} className='animate-pulse'>Carregando relatórios...</p></div>

  const pieData = (data.por_categoria || []).map(c => ({ name: c.nome, value: c.total }))

  const exportarCSV = () => {
    const cabecalho = 'Tipo,Descricao,Valor,Data\n'
    const receitasCSV = (data.receitas || []).map(r => `Receita,"${r.descricao}",${r.valor},${r.criado_em}`).join('\n')
    const despesasCSV = (data.despesas || []).map(d => `Despesa,"${d.descricao}",${d.valor},${d.criado_em}`).join('\n')
    const blob = new Blob([cabecalho + receitasCSV + '\n' + despesasCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'relatorio_financeiro.csv'
    link.click()
  }

  return (
    <>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Relatórios</h1>
          <p style={{ color: 'var(--text-muted)' }} className='mt-1 text-sm md:text-base'>Análise detalhada das suas finanças</p>
        </div>
        <div className='flex gap-3 w-full sm:w-auto'>
          <button onClick={exportarCSV} className='flex-1 sm:flex-none border px-4 py-3 rounded-xl font-semibold hover:opacity-80 transition flex items-center justify-center gap-2'
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>📊 CSV</button>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8'>
        {[
          { label: 'Receitas', value: fmt(data.total_receitas), color: 'text-green-500' },
          { label: 'Despesas', value: fmt(data.total_despesas), color: 'text-red-500' },
          { label: 'Saldo', value: fmt(data.saldo), color: 'text-blue-500' },
          { label: 'Investido', value: fmt(data.total_investido), color: 'text-purple-500' },
        ].map((item, i) => (
          <div key={i} className='rounded-2xl p-4 md:p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)' }} className='text-xs md:text-sm'>{item.label}</p>
            <h2 className={`text-xl md:text-3xl font-bold mt-1 md:mt-2 ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8'>
        <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Despesas por Categoria</h2>
          {pieData.length > 0 ? (
            <div className='h-80'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie data={pieData} cx='50%' cy='50%' outerRadius={100} dataKey='value' label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }} formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>Sem dados de categoria</p>}
        </div>

        <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Detalhamento por Categoria</h2>
          <div className='space-y-4'>
            {(data.por_categoria || []).map((cat, i) => (
              <div key={i} className='flex items-center justify-between p-4 rounded-xl' style={{ background: 'var(--bg-input)' }}>
                <div className='flex items-center gap-3'>
                  <div className='w-4 h-4 rounded-full' style={{ backgroundColor: cat.cor || COLORS[i % COLORS.length] }} />
                  <span style={{ color: 'var(--text-main)' }}>{cat.nome}</span>
                </div>
                <span className='text-red-500 font-semibold'>{fmt(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Últimas Receitas</h2>
          <div className='space-y-3'>
            {(data.receitas || []).slice(0, 5).map((r, i) => (
              <div key={i} className='flex justify-between p-4 rounded-xl' style={{ background: 'var(--bg-input)' }}>
                <span style={{ color: 'var(--text-main)' }}>{r.descricao}</span>
                <span className='text-green-500 font-semibold'>{fmt(r.valor)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Últimas Despesas</h2>
          <div className='space-y-3'>
            {(data.despesas || []).slice(0, 5).map((d, i) => (
              <div key={i} className='flex justify-between items-center p-4 rounded-xl' style={{ background: 'var(--bg-input)' }}>
                <span style={{ color: 'var(--text-main)' }}>{d.descricao}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-red-500 font-semibold'>{fmt(d.valor)}</span>
                  {d.pago ? <span className='bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs'>Paga</span>
                          : <span className='bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs'>Pendente</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
