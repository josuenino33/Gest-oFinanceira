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
    if (user) { setNome(user.nome || ''); setEmail(user.email || '') }
  }, [user])

  const salvar = async () => {
    setSaving(true); setMsg('')
    try {
      await api.put('/perfil', { nome, email })
      login(token, { ...user, nome, email })
      setMsg('Perfil atualizado com sucesso!')
    } catch (e) { setMsg('Erro ao atualizar perfil') }
    finally { setSaving(false) }
  }

  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Configurações</h1>
        <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Gerencie seu perfil e preferências</p>
      </div>

      <div className='max-w-2xl'>
        <div className='rounded-2xl p-8 border mb-6' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Perfil do Usuário</h2>
          <div className='flex items-center gap-6 mb-8'>
            <div className='w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl font-bold text-white'>
              {nome ? nome.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h3 className='text-xl font-bold' style={{ color: 'var(--text-main)' }}>{nome || 'Usuário'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{email}</p>
            </div>
          </div>
          <div className='space-y-4'>
            <div>
              <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
            </div>
            <div>
              <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type='email' className='w-full rounded-xl p-4 border outline-none focus:border-green-400' style={inputStyle} />
            </div>
            {msg && <p className={`text-sm ${msg.includes('sucesso') ? 'text-green-500' : 'text-red-500'}`}>{msg}</p>}
            <button onClick={salvar} disabled={saving} className='bg-green-500 text-black rounded-xl px-6 py-4 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        <div className='rounded-2xl p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className='text-2xl font-bold mb-6' style={{ color: 'var(--text-main)' }}>Informações do Sistema</h2>
          <div className='space-y-4'>
            {[['Versão', '1.0.0'], ['Tecnologia', 'React + Flask'], ['Banco de Dados', 'SQLite']].map(([l, v]) => (
              <div key={l} className='flex justify-between p-4 rounded-xl' style={{ background: 'var(--bg-input)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ color: 'var(--text-main)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
