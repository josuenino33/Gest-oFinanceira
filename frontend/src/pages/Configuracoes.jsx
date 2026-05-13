import { useEffect, useState } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Configuracoes() {
  const { user, login, token, logout } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    if (user) { setNome(user.nome || ''); setEmail(user.email || '') }
  }, [user])

  const salvarPerfil = async () => {
    if (!nome || !email) return toast('Preencha nome e email.', 'warning')
    setSaving(true)
    try {
      await api.put('/perfil', { nome, email })
      login(token, { ...user, nome, email })
      toast('Perfil atualizado!', 'success')
    } catch { toast('Erro ao atualizar perfil.', 'error') }
    finally { setSaving(false) }
  }

  const salvarSenha = async () => {
    if (!senhaAtual || !novaSenha) return toast('Preencha os campos de senha.', 'warning')
    if (novaSenha.length < 6) return toast('A nova senha deve ter ao menos 6 caracteres.', 'warning')
    setSavingPwd(true)
    try {
      await api.put('/perfil/senha', { senha_atual: senhaAtual, nova_senha: novaSenha })
      toast('Senha alterada com sucesso!', 'success')
      setSenhaAtual(''); setNovaSenha('')
    } catch (e) {
      toast(e.response?.data?.msg || 'Erro ao alterar senha.', 'error')
    }
    finally { setSavingPwd(false) }
  }

  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  return (
    <>
      <div className='mb-8'>
        <h1 className='text-4xl font-bold' style={{ color: 'var(--text-main)' }}>Configurações</h1>
        <p style={{ color: 'var(--text-muted)' }} className='mt-2'>Gerencie seu perfil e preferências</p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* Perfil */}
        <div className='lg:col-span-2 rounded-2xl p-8 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-5 mb-8'>
            <div className='w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shrink-0'>
              {nome ? nome.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h2 className='text-2xl font-bold' style={{ color: 'var(--text-main)' }}>{nome || 'Usuário'}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{email}</p>
            </div>
          </div>
          <h3 className='text-lg font-semibold mb-4' style={{ color: 'var(--text-main)' }}>Dados Pessoais</h3>
          <div className='space-y-4'>
            <div>
              <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className='w-full rounded-xl p-4 border outline-none focus:border-green-400 transition' style={inputStyle} />
            </div>
            <div>
              <label className='text-sm mb-2 block' style={{ color: 'var(--text-muted)' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type='email' className='w-full rounded-xl p-4 border outline-none focus:border-green-400 transition' style={inputStyle} />
            </div>
            <button onClick={salvarPerfil} disabled={saving} className='bg-green-500 text-black rounded-xl px-6 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Sidebar direita */}
        <div className='flex flex-col gap-6'>

          {/* Alterar Senha */}
          <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className='text-lg font-semibold mb-4' style={{ color: 'var(--text-main)' }}>🔒 Alterar Senha</h3>
            <div className='space-y-3'>
              <input
                value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                type='password' placeholder='Senha atual'
                className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition text-sm' style={inputStyle}
              />
              <input
                value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                type='password' placeholder='Nova senha (mín. 6 caracteres)'
                className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition text-sm' style={inputStyle}
              />
              <button onClick={salvarSenha} disabled={savingPwd} className='w-full bg-green-500 text-black rounded-xl px-4 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60 text-sm'>
                {savingPwd ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>

          {/* Sobre */}
          <div className='rounded-2xl p-6 border' style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className='text-lg font-semibold mb-4' style={{ color: 'var(--text-main)' }}>Sobre o App</h3>
            <div className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span style={{ color: 'var(--text-muted)' }}>Versão</span>
                <span className='font-semibold' style={{ color: 'var(--text-main)' }}>1.0.0</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span style={{ color: 'var(--text-muted)' }}>Conta</span>
                <span className='font-semibold text-green-500'>Ativa</span>
              </div>
            </div>
          </div>

          {/* Sair */}
          <button
            onClick={logout}
            className='w-full rounded-2xl p-4 border border-red-500/30 text-red-500 font-semibold hover:bg-red-500/10 transition text-sm'
            style={{ background: 'var(--bg-card)' }}
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </>
  )
}
