import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export default function GraficoFinanceiro({ title, data }) {
  return (
    <div className='bg-[#0d1a2d] rounded-3xl p-6 border border-gray-800'>
      <div className='mb-6 flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>{title}</h2>
      </div>
      <div className='h-80'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id='colorReceita' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='#34d399' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#34d399' stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='#1f2b42' vertical={false} />
            <XAxis dataKey='name' stroke='#829ab1' />
            <YAxis stroke='#829ab1' />
            <Tooltip contentStyle={{ background: '#0b1728', border: '1px solid #334155' }} />
            <Area type='monotone' dataKey='value' stroke='#34d399' fill='url(#colorReceita)' />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
