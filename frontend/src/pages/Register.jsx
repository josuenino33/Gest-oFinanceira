import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const toast = useToast()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/register', { nome, email, password })
      toast('Conta criada com sucesso! Faça login para continuar.')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#07111f] flex items-center justify-center p-6'>
      <div className='w-full max-w-md rounded-3xl border border-gray-800 bg-[#0b1728] p-10 text-white shadow-xl'>
        <h1 className='text-4xl font-bold mb-2'>Criar Conta</h1>
        <p className='text-gray-400 mb-8'>Comece a gerenciar suas finanças hoje.</p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <label className='block'>
            <span className='text-sm text-gray-300'>Nome Completo</span>
            <input
              type='text'
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='Ex: João Silva'
            />
          </label>

          <label className='block'>
            <span className='text-sm text-gray-300'>Email</span>
            <input
              type='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='email@exemplo.com'
            />
          </label>

          <label className='block'>
            <span className='text-sm text-gray-300'>Senha</span>
            <input
              type='password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='••••••••'
            />
          </label>

          {error && <p className='text-sm text-red-400'>{error}</p>}

          <button
            type='submit'
            disabled={loading}
            className='mt-4 w-full rounded-2xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60'
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <p className='mt-8 text-center text-gray-400 text-sm'>
          Já tem uma conta? <Link to='/login' className='text-green-400 hover:underline font-semibold'>Fazer Login</Link>
        </p>
      </div>
    </div>
  )
}
