import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/login', { email, password })
      login(response.data.access_token, response.data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError('Usuário ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#07111f] flex items-center justify-center p-6'>
      <div className='w-full max-w-md rounded-3xl border border-gray-800 bg-[#0b1728] p-10 text-white shadow-xl'>
        <h1 className='text-4xl font-bold mb-6'>Login</h1>
        <p className='text-gray-400 mb-8'>Acesse sua conta para gerenciar suas finanças.</p>
        <form onSubmit={handleSubmit} className='space-y-4'>
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

          <div className='flex justify-end'>
            <Link to='/forgot-password' replace className='text-xs text-gray-500 hover:text-green-400 transition-colors'>
              Esqueceu a senha?
            </Link>
          </div>

          {error && <p className='text-sm text-red-400'>{error}</p>}

          <button
            type='submit'
            disabled={loading}
            className='mt-4 w-full rounded-2xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60'
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className='mt-8 text-center text-gray-400 text-sm'>
          Não tem uma conta? <Link to='/register' className='text-green-400 hover:underline font-semibold'>Criar Conta</Link>
        </p>
      </div>
    </div>
  )
}
