import { useEffect, useState } from 'react'
import api from '../utils/api'
import Layout from '../components/Layout'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899']

export default function Relatorios() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/relatorios').then(r => setData(r.data)).catch(console.error)
  }, [])

  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (!data) {
    return <Layout><div className='flex items-center justify-center h-96'><p className='text-gray-400 animate-pulse'>Carregando relatórios...</p></div></Layout>
  }

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
    <Layout>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8'>
        <div>
          <h1 className='text-2xl md:text-4xl font-bold'>Relatórios</h1>
          <p className='text-gray-400 mt-1 text-sm md:text-base'>Análise detalhada das suas finanças</p>
        </div>
        <button 
          onClick={exportarCSV}
          className='w-full sm:w-auto bg-[#132238] border border-gray-700 px-6 py-3 rounded-xl font-semibold text-gray-300 hover:bg-gray-800 transition flex items-center justify-center gap-2'
        >
          📥 Exportar CSV
        </button>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8'>
        {[
          { label: 'Receitas', value: fmt(data.total_receitas), color: 'text-green-400' },
          { label: 'Despesas', value: fmt(data.total_despesas), color: 'text-red-400' },
          { label: 'Saldo', value: fmt(data.saldo), color: 'text-blue-400' },
          { label: 'Investido', value: fmt(data.total_investido), color: 'text-purple-400' },
        ].map((item, i) => (
          <div key={i} className='bg-[#0d1a2d] rounded-2xl p-4 md:p-6 border border-gray-800'>
            <p className='text-gray-400 text-xs md:text-sm'>{item.label}</p>
            <h2 className={`text-xl md:text-3xl font-bold mt-1 md:mt-2 ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8'>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Despesas por Categoria</h2>
          {pieData.length > 0 ? (
            <div className='h-80'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie data={pieData} cx='50%' cy='50%' outerRadius={100} dataKey='value' label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0b1728', border: '1px solid #334155', borderRadius: '12px' }} formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className='text-gray-500'>Sem dados de categoria</p>}
        </div>

        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Detalhamento por Categoria</h2>
          <div className='space-y-4'>
            {(data.por_categoria || []).map((cat, i) => (
              <div key={i} className='flex items-center justify-between bg-[#132238] p-4 rounded-xl'>
                <div className='flex items-center gap-3'>
                  <div className='w-4 h-4 rounded-full' style={{ backgroundColor: cat.cor || COLORS[i % COLORS.length] }} />
                  <span>{cat.nome}</span>
                </div>
                <span className='text-red-400 font-semibold'>{fmt(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Últimas Receitas</h2>
          <div className='space-y-3'>
            {(data.receitas || []).slice(0, 5).map((r, i) => (
              <div key={i} className='flex justify-between bg-[#132238] p-4 rounded-xl'>
                <span>{r.descricao}</span>
                <span className='text-green-400 font-semibold'>{fmt(r.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-[#0d1a2d] rounded-2xl p-6 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Últimas Despesas</h2>
          <div className='space-y-3'>
            {(data.despesas || []).slice(0, 5).map((d, i) => (
              <div key={i} className='flex justify-between items-center bg-[#132238] p-4 rounded-xl'>
                <span>{d.descricao}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-red-400 font-semibold'>{fmt(d.valor)}</span>
                  {d.pago
                    ? <span className='bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs'>Paga</span>
                    : <span className='bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs'>Pendente</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
