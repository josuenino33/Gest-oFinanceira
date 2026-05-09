export default function Header({ title, subtitle }) {
  return (
    <header className='mb-8 flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-4xl font-bold'>{title}</h1>
          <p className='text-gray-400 mt-2'>{subtitle}</p>
        </div>
      </div>
    </header>
  )
}
