import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem'); return }
    if (newPassword.length < 4) { setError('A senha deve ter pelo menos 4 caracteres'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/reset-password', { email, password: newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.msg || 'Email não encontrado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#07111f] flex items-center justify-center p-6 font-sans text-white'>
      <div className='w-full max-w-md rounded-3xl border border-gray-800 bg-[#0b1728] p-10 shadow-2xl'>
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold mb-2'>Redefinir Senha</h1>
          <p className='text-gray-400 text-sm'>
            {success ? 'Tudo pronto!' : 'Informe seu email e escolha uma nova senha.'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleReset} className='space-y-5'>
            <div className='space-y-2'>
              <label className='text-sm text-gray-400 font-medium ml-1'>Email da conta</label>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full rounded-2xl border border-gray-700 bg-[#111f34] px-5 py-4 text-white outline-none focus:border-green-400 transition-all placeholder:text-gray-600'
                placeholder='seu@email.com'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm text-gray-400 font-medium ml-1'>Nova Senha</label>
              <input
                type='password'
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className='w-full rounded-2xl border border-gray-700 bg-[#111f34] px-5 py-4 text-white outline-none focus:border-green-400 transition-all'
                placeholder='••••••••'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-sm text-gray-400 font-medium ml-1'>Confirmar Senha</label>
              <input
                type='password'
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className='w-full rounded-2xl border border-gray-700 bg-[#111f34] px-5 py-4 text-white outline-none focus:border-green-400 transition-all'
                placeholder='••••••••'
              />
            </div>
            {error && <p className='text-sm text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20'>{error}</p>}
            <button
              type='submit'
              disabled={loading}
              className='w-full rounded-2xl bg-green-500 py-4 font-bold text-black transition-all hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-green-500/20'
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
            <div className='text-center mt-4'>
              <Link to='/login' className='text-gray-500 hover:text-green-400 text-sm transition-colors'>
                Voltar para o Login
              </Link>
            </div>
          </form>
        ) : (
          <div className='text-center space-y-6'>
            <div className='w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20'>
              <span className='text-4xl'>✅</span>
            </div>
            <p className='text-green-400 font-medium'>Senha alterada com sucesso!</p>
            <Link
              to='/login'
              className='block w-full rounded-2xl bg-gray-800 py-4 font-bold text-white transition-all hover:bg-gray-700'
            >
              Ir para o Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
