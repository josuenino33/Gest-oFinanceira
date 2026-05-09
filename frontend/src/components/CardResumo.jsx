export default function CardResumo({ title, value, className }) {
  return (
    <div className={`rounded-3xl p-6 shadow-lg border border-gray-800 ${className}`}>
      <h2 className='text-sm uppercase tracking-[0.2em] text-gray-400'>{title}</h2>
      <p className='mt-4 text-3xl font-bold'>{value}</p>
    </div>
  )
}
