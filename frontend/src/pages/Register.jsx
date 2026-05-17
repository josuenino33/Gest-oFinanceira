import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'

function passwordStrength(p) {
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
}

const strengthLabel = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

export default function Register() {
  const toast = useToast()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [showCodigo, setShowCodigo] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = password ? passwordStrength(password) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/register', { nome, username, email: email || undefined, password, codigo_seguranca: codigo })
      toast('Conta criada! Faça login para continuar.')
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
              type='text' required value={nome} onChange={e => setNome(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='Ex: João Silva' autoComplete='name'
            />
          </label>

          <label className='block'>
            <span className='text-sm text-gray-300'>Username <span className='text-green-400'>*</span></span>
            <input
              type='text' required value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='seu_usuario' autoComplete='username'
            />
            <p className='text-[11px] text-gray-500 mt-1 ml-1'>Usado para entrar. Letras, números, _ e .</p>
          </label>

          <label className='block'>
            <span className='text-sm text-gray-300'>Email <span className='text-gray-500'>(opcional)</span></span>
            <input
              type='email' value={email} onChange={e => setEmail(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='email@exemplo.com' autoComplete='email'
            />
          </label>

          <label className='block'>
            <span className='text-sm text-gray-300'>Senha <span className='text-green-400'>*</span></span>
            <input
              type='password' required value={password} onChange={e => setPassword(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='••••••••' autoComplete='new-password'
            />
            {password && (
              <div className='mt-2 space-y-1'>
                <div className='flex gap-1'>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className='h-1 flex-1 rounded-full transition-colors'
                      style={{ background: i <= strength ? strengthColor[strength] : '#1e3a5f' }} />
                  ))}
                </div>
                <p className='text-[11px] ml-1' style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                <p className='text-[11px] text-gray-500 ml-1'>Mín. 8 caracteres, uma maiúscula e um número</p>
              </div>
            )}
          </label>

          <label className='block'>
            <div className='flex items-center gap-1'>
              <span className='text-sm text-gray-300'>Código de Recuperação <span className='text-green-400'>*</span></span>
              <button type='button' onClick={() => setShowCodigo(v => !v)}
                className='text-[11px] text-gray-500 hover:text-gray-300 ml-auto'>
                {showCodigo ? 'ocultar' : 'mostrar'}
              </button>
            </div>
            <input
              type={showCodigo ? 'text' : 'password'} required value={codigo} onChange={e => setCodigo(e.target.value)}
              className='mt-2 w-full rounded-2xl border border-gray-700 bg-[#111f34] px-4 py-3 text-white outline-none focus:border-green-400'
              placeholder='Palavra ou frase secreta' autoComplete='off'
            />
            <p className='text-[11px] text-gray-500 mt-1 ml-1'>Guarde bem — é o único jeito de recuperar sua senha.</p>
          </label>

          {error && <p className='text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-xl'>{error}</p>}

          <button
            type='submit' disabled={loading}
            className='mt-4 w-full rounded-2xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60'
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <p className='mt-8 text-center text-gray-400 text-sm'>
          Já tem uma conta?{' '}
          <Link to='/login' className='text-green-400 hover:underline font-semibold'>Fazer Login</Link>
        </p>
      </div>
    </div>
  )
}
