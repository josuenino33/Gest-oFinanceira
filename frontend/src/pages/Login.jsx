import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={from} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { username: identifier, password }
      if (step === 2) payload.totp_code = totpCode
      const res = await api.post('/login', payload)
      if (res.data.requires_2fa) { setStep(2); setLoading(false); return }
      login(res.data.access_token, res.data.refresh_token, res.data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.msg || 'Usuário ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#07111f] flex items-center justify-center p-6'>
      <div className='w-full max-w-md rounded-3xl border border-gray-800 bg-[#0b1728] p-10 text-white shadow-xl'>
        {step === 1 ? (
          <>
            <h1 className='text-4xl font-bold mb-2'>Login</h1>
            <p className='text-gray-400 mb-8'>Acesse sua conta para gerenciar suas finanças.</p>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <label className='block'>
                <span className='text-sm text-gray-300'>Username ou Email</span>
                <input type='text' required value={identifier} onChange={e => setIdentifier(e.target.value)}
                  className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                  placeholder='seu_usuario' autoComplete='username' />
              </label>
              <label className='block'>
                <span className='text-sm text-gray-300'>Senha</span>
                <input type='password' required value={password} onChange={e => setPassword(e.target.value)}
                  className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                  placeholder='••••••••' autoComplete='current-password' />
              </label>
              <div className='flex justify-end'>
                <Link to='/forgot-password' className='text-xs text-gray-500 hover:text-green-400 transition-colors'>Esqueceu a senha?</Link>
              </div>
              {error && <p className='text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-xl'>{error}</p>}
              <button type='submit' disabled={loading}
                className='mt-4 w-full rounded-2xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60'>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p className='mt-8 text-center text-gray-400 text-sm'>
              Não tem uma conta?{' '}
              <Link to='/register' className='text-green-400 hover:underline font-semibold'>Criar Conta</Link>
            </p>
          </>
        ) : (
          <>
            <div className='text-center mb-8'>
              <div className='w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mx-auto mb-4'>🔐</div>
              <h1 className='text-2xl font-bold mb-1'>Verificação em 2 Etapas</h1>
              <p className='text-gray-400 text-sm'>Abra o Google Authenticator e insira o código de 6 dígitos.</p>
            </div>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <input type='text' inputMode='numeric' pattern='[0-9]{6}' maxLength={6} required
                value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className='w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-4 text-white text-center text-2xl tracking-widest outline-none focus:border-green-400'
                placeholder='000000' autoComplete='one-time-code' autoFocus />
              {error && <p className='text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-xl text-center'>{error}</p>}
              <button type='submit' disabled={loading || totpCode.length !== 6}
                className='w-full rounded-2xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60'>
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <button type='button' onClick={() => { setStep(1); setError(''); setTotpCode('') }}
                className='w-full text-sm text-gray-500 hover:text-gray-300 transition'>
                ← Voltar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
