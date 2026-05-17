import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ForgotPassword() {
  const [username, setUsername] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    if (novaSenha !== confirmar) { setError('As senhas não coincidem'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/recuperar-senha', { username, codigo_seguranca: codigo, nova_senha: novaSenha })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.msg || 'Username ou código incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#07111f] flex items-center justify-center p-6 text-white'>
      <div className='w-full max-w-md rounded-3xl border border-gray-800 bg-[#0b1728] p-10 shadow-2xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold mb-2'>Recuperar Senha</h1>
          <p className='text-gray-400 text-sm'>
            {success ? 'Senha alterada com sucesso!' : 'Informe seu username e código de recuperação.'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleReset} className='space-y-4'>
            <label className='block'>
              <span className='text-sm text-gray-300'>Username</span>
              <input
                type='text' required value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                placeholder='seu_usuario' autoComplete='username'
              />
            </label>

            <label className='block'>
              <span className='text-sm text-gray-300'>Código de Recuperação</span>
              <input
                type='password' required value={codigo} onChange={e => setCodigo(e.target.value)}
                className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                placeholder='Sua palavra ou frase secreta' autoComplete='off'
              />
            </label>

            <label className='block'>
              <span className='text-sm text-gray-300'>Nova Senha</span>
              <input
                type='password' required value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                placeholder='••••••••' autoComplete='new-password'
              />
              <p className='text-[11px] text-gray-500 mt-1 ml-1'>Mín. 8 caracteres, uma maiúscula e um número</p>
            </label>

            <label className='block'>
              <span className='text-sm text-gray-300'>Confirmar Nova Senha</span>
              <input
                type='password' required value={confirmar} onChange={e => setConfirmar(e.target.value)}
                className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
                placeholder='••••••••' autoComplete='new-password'
              />
            </label>

            {error && <p className='text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-xl'>{error}</p>}

            <button
              type='submit' disabled={loading}
              className='w-full rounded-2xl bg-green-500 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-60'
            >
              {loading ? 'Verificando...' : 'Redefinir Senha'}
            </button>

            <div className='text-center'>
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
              className='block w-full rounded-2xl bg-gray-800 py-3 font-bold text-white transition hover:bg-gray-700'
            >
              Ir para o Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
