import { useEffect, useState } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function Configuracoes() {
  const { user, login, token } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (user) {
      setNome(user.nome || '')
      setEmail(user.email || '')
    }
  }, [user])

  const salvar = async () => {
    setSaving(true)
    setMsg('')
    try {
      await api.put('/perfil', { nome, email })
      login(token, { ...user, nome, email })
      setMsg('Perfil atualizado com sucesso!')
    } catch (e) {
      setMsg('Erro ao atualizar perfil')
    }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold'>Configurações</h1>
        <p className='text-gray-400 mt-2'>Gerencie seu perfil e preferências</p>
      </div>

      <div className='max-w-2xl'>
        <div className='bg-[#0d1a2d] rounded-2xl p-8 border border-gray-800 mb-6'>
          <h2 className='text-2xl font-bold mb-6'>Perfil do Usuário</h2>

          <div className='flex items-center gap-6 mb-8'>
            <div className='w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl font-bold'>
              {nome ? nome.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h3 className='text-xl font-bold'>{nome || 'Usuário'}</h3>
              <p className='text-gray-400'>{email}</p>
            </div>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='text-sm text-gray-400 mb-2 block'>Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
            </div>
            <div>
              <label className='text-sm text-gray-400 mb-2 block'>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type='email'
                className='w-full bg-[#111f34] rounded-xl p-4 border border-gray-700 text-white outline-none focus:border-green-400' />
            </div>

            {msg && (
              <p className={`text-sm ${msg.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
            )}

            <button onClick={salvar} disabled={saving}
              className='bg-green-500 rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        <div className='bg-[#0d1a2d] rounded-2xl p-8 border border-gray-800'>
          <h2 className='text-2xl font-bold mb-6'>Informações do Sistema</h2>
          <div className='space-y-4'>
            <div className='flex justify-between bg-[#132238] p-4 rounded-xl'>
              <span className='text-gray-400'>Versão</span>
              <span>1.0.0</span>
            </div>
            <div className='flex justify-between bg-[#132238] p-4 rounded-xl'>
              <span className='text-gray-400'>Tecnologia</span>
              <span>React + Flask</span>
            </div>
            <div className='flex justify-between bg-[#132238] p-4 rounded-xl'>
              <span className='text-gray-400'>Banco de Dados</span>
              <span>SQLite</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
