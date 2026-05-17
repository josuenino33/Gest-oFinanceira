import { useEffect, useState } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function Tab({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${active ? 'bg-green-500 text-black' : 'hover:bg-white/5'}`}
      style={active ? {} : { color: 'var(--text-muted)' }}>
      <span>{icon}</span>{label}
    </button>
  )
}

export default function Configuracoes() {
  const { user, login, token, logout } = useAuth()
  const toast = useToast()
  const [aba, setAba] = useState('perfil')
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }

  // Perfil
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senhaAtualPerfil, setSenhaAtualPerfil] = useState('')
  const [saving, setSaving] = useState(false)

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  // 2FA
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [senhaDisable2fa, setSenhaDisable2fa] = useState('')
  const [loading2fa, setLoading2fa] = useState(false)

  // Sessões
  const [sessoes, setSessoes] = useState([])

  // Logs
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (user) { setNome(user.nome || ''); setEmail(user.email || '') }
  }, [user])

  useEffect(() => {
    if (aba === '2fa') {
      api.get('/2fa/status').then(r => setTwoFaEnabled(r.data.enabled)).catch(() => {})
    }
    if (aba === 'sessoes') {
      api.get('/sessoes').then(r => setSessoes(r.data || [])).catch(() => {})
    }
    if (aba === 'logs') {
      api.get('/logs').then(r => setLogs(r.data || [])).catch(() => {})
    }
  }, [aba])

  const salvarPerfil = async () => {
    if (!nome) return toast('Preencha o nome.', 'warning')
    if (!senhaAtualPerfil) return toast('Digite sua senha atual para confirmar.', 'warning')
    setSaving(true)
    try {
      await api.put('/perfil', { nome, email, senha_atual: senhaAtualPerfil })
      login(token, localStorage.getItem('finance-dashboard-refresh'), { ...user, nome, email })
      toast('Perfil atualizado!', 'success')
      setSenhaAtualPerfil('')
    } catch (e) { toast(e.response?.data?.msg || 'Erro ao atualizar perfil.', 'error') }
    finally { setSaving(false) }
  }

  const salvarSenha = async () => {
    if (!senhaAtual || !novaSenha) return toast('Preencha os campos de senha.', 'warning')
    setSavingPwd(true)
    try {
      await api.put('/perfil/senha', { senha_atual: senhaAtual, nova_senha: novaSenha })
      toast('Senha alterada com sucesso!', 'success')
      setSenhaAtual(''); setNovaSenha('')
    } catch (e) { toast(e.response?.data?.msg || 'Erro ao alterar senha.', 'error') }
    finally { setSavingPwd(false) }
  }

  const iniciar2fa = async () => {
    setLoading2fa(true)
    try {
      const r = await api.get('/2fa/setup')
      setQrCode(r.data.qr)
    } catch { toast('Erro ao configurar 2FA', 'error') }
    finally { setLoading2fa(false) }
  }

  const ativar2fa = async () => {
    if (totpCode.length !== 6) return toast('Digite o código de 6 dígitos', 'warning')
    setLoading2fa(true)
    try {
      await api.post('/2fa/activate', { code: totpCode })
      setTwoFaEnabled(true); setQrCode(null); setTotpCode('')
      toast('2FA ativado! Sua conta está mais segura.', 'success')
    } catch (e) { toast(e.response?.data?.msg || 'Código inválido', 'error') }
    finally { setLoading2fa(false) }
  }

  const desativar2fa = async () => {
    if (!senhaDisable2fa) return toast('Digite sua senha para desativar', 'warning')
    setLoading2fa(true)
    try {
      await api.delete('/2fa/disable', { data: { senha: senhaDisable2fa } })
      setTwoFaEnabled(false); setSenhaDisable2fa('')
      toast('2FA desativado', 'success')
    } catch (e) { toast(e.response?.data?.msg || 'Senha incorreta', 'error') }
    finally { setLoading2fa(false) }
  }

  const encerrarSessao = async (jti) => {
    try {
      await api.delete(`/sessoes/${jti}`)
      setSessoes(prev => prev.filter(s => s.jti !== jti))
      toast('Sessão encerrada', 'success')
    } catch { toast('Erro ao encerrar sessão', 'error') }
  }

  const formatDate = (str) => {
    if (!str) return '—'
    try { return new Date(str).toLocaleString('pt-BR') } catch { return str }
  }

  const actionLabel = { login: '✅ Login', login_failed: '❌ Tentativa falhou', logout: '🚪 Logout' }

  const card = 'rounded-2xl p-6 border'
  const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }

  return (
    <>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold' style={{ color: 'var(--text-main)' }}>Configurações</h1>
        <p className='mt-1 text-sm' style={{ color: 'var(--text-muted)' }}>Gerencie seu perfil e segurança</p>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 mb-6 overflow-x-auto pb-1'>
        <Tab id='perfil' label='Perfil' icon='👤' active={aba === 'perfil'} onClick={setAba} />
        <Tab id='senha' label='Senha' icon='🔑' active={aba === 'senha'} onClick={setAba} />
        <Tab id='2fa' label='2FA' icon='🔐' active={aba === '2fa'} onClick={setAba} />
        <Tab id='sessoes' label='Sessões' icon='📱' active={aba === 'sessoes'} onClick={setAba} />
        <Tab id='logs' label='Acessos' icon='📋' active={aba === 'logs'} onClick={setAba} />
      </div>

      {/* Perfil */}
      {aba === 'perfil' && (
        <div className={`${card} max-w-lg`} style={cardStyle}>
          <div className='flex items-center gap-4 mb-6'>
            <div className='w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shrink-0'>
              {nome ? nome.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p className='font-bold text-lg' style={{ color: 'var(--text-main)' }}>{nome || 'Usuário'}</p>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>@{user?.username || '—'}</p>
            </div>
          </div>
          <div className='space-y-4'>
            <div>
              <label className='text-sm mb-1 block' style={{ color: 'var(--text-muted)' }}>Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition' style={inputStyle} />
            </div>
            <div>
              <label className='text-sm mb-1 block' style={{ color: 'var(--text-muted)' }}>Email <span className='opacity-50'>(opcional)</span></label>
              <input value={email} onChange={e => setEmail(e.target.value)} type='email' className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition' style={inputStyle} />
            </div>
            <div>
              <label className='text-sm mb-1 block' style={{ color: 'var(--text-muted)' }}>Confirme sua senha atual</label>
              <input value={senhaAtualPerfil} onChange={e => setSenhaAtualPerfil(e.target.value)} type='password' className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition' style={inputStyle} placeholder='••••••••' />
            </div>
            <button onClick={salvarPerfil} disabled={saving} className='bg-green-500 text-black rounded-xl px-6 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      )}

      {/* Senha */}
      {aba === 'senha' && (
        <div className={`${card} max-w-lg`} style={cardStyle}>
          <h2 className='text-lg font-bold mb-4' style={{ color: 'var(--text-main)' }}>Alterar Senha</h2>
          <div className='space-y-4'>
            <div>
              <label className='text-sm mb-1 block' style={{ color: 'var(--text-muted)' }}>Senha atual</label>
              <input value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} type='password' className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition' style={inputStyle} placeholder='••••••••' />
            </div>
            <div>
              <label className='text-sm mb-1 block' style={{ color: 'var(--text-muted)' }}>Nova senha</label>
              <input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type='password' className='w-full rounded-xl p-3 border outline-none focus:border-green-400 transition' style={inputStyle} placeholder='Mín. 8 chars, maiúscula e número' />
            </div>
            <button onClick={salvarSenha} disabled={savingPwd} className='bg-green-500 text-black rounded-xl px-6 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
              {savingPwd ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>
      )}

      {/* 2FA */}
      {aba === '2fa' && (
        <div className={`${card} max-w-lg`} style={cardStyle}>
          <div className='flex items-center gap-3 mb-6'>
            <span className='text-3xl'>🔐</span>
            <div>
              <h2 className='font-bold text-lg' style={{ color: 'var(--text-main)' }}>Autenticação em 2 Fatores</h2>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                Status: <span className={twoFaEnabled ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>{twoFaEnabled ? 'Ativado' : 'Desativado'}</span>
              </p>
            </div>
          </div>

          {!twoFaEnabled ? (
            <div className='space-y-4'>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                O 2FA adiciona uma camada extra de segurança. Além da senha, você precisará de um código do Google Authenticator para entrar.
              </p>
              {!qrCode ? (
                <button onClick={iniciar2fa} disabled={loading2fa} className='bg-green-500 text-black rounded-xl px-6 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
                  {loading2fa ? 'Gerando QR Code...' : 'Ativar 2FA'}
                </button>
              ) : (
                <div className='space-y-4'>
                  <p className='text-sm font-semibold' style={{ color: 'var(--text-main)' }}>1. Escaneie o QR Code com o Google Authenticator:</p>
                  <div className='flex justify-center p-4 rounded-xl bg-white'>
                    <img src={`data:image/png;base64,${qrCode}`} alt='QR Code 2FA' className='w-48 h-48' />
                  </div>
                  <p className='text-sm font-semibold' style={{ color: 'var(--text-main)' }}>2. Digite o código gerado pelo app:</p>
                  <input type='text' inputMode='numeric' maxLength={6} value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className='w-full rounded-xl p-3 border outline-none focus:border-green-400 text-center text-2xl tracking-widest transition' style={inputStyle}
                    placeholder='000000' />
                  <button onClick={ativar2fa} disabled={loading2fa || totpCode.length !== 6}
                    className='w-full bg-green-500 text-black rounded-xl px-6 py-3 font-semibold hover:bg-green-400 transition disabled:opacity-60'>
                    {loading2fa ? 'Ativando...' : 'Confirmar e Ativar'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20'>
                <span>✅</span>
                <p className='text-sm text-green-400 font-medium'>2FA ativo — sua conta está protegida</p>
              </div>
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Para desativar, confirme sua senha:</p>
              <input value={senhaDisable2fa} onChange={e => setSenhaDisable2fa(e.target.value)} type='password'
                className='w-full rounded-xl p-3 border outline-none focus:border-red-400 transition' style={inputStyle} placeholder='Sua senha atual' />
              <button onClick={desativar2fa} disabled={loading2fa}
                className='bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl px-6 py-3 font-semibold hover:bg-red-500/30 transition disabled:opacity-60'>
                {loading2fa ? 'Desativando...' : 'Desativar 2FA'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sessões */}
      {aba === 'sessoes' && (
        <div className={`${card} max-w-2xl`} style={cardStyle}>
          <h2 className='font-bold text-lg mb-4' style={{ color: 'var(--text-main)' }}>Sessões Ativas</h2>
          {sessoes.length === 0 ? (
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Nenhuma sessão ativa encontrada.</p>
          ) : (
            <div className='divide-y' style={{ borderColor: 'var(--border-color)' }}>
              {sessoes.map((s, i) => (
                <div key={s.jti || i} className='py-4 flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0' style={{ background: 'var(--bg-input)' }}>
                    {s.device?.toLowerCase().includes('mobile') || s.device?.toLowerCase().includes('android') || s.device?.toLowerCase().includes('iphone') ? '📱' : '💻'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-semibold truncate' style={{ color: 'var(--text-main)' }}>{s.device?.split('(')[0]?.trim() || 'Dispositivo desconhecido'}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>IP: {s.ip} · Último acesso: {formatDate(s.last_seen)}</p>
                  </div>
                  <button onClick={() => encerrarSessao(s.jti)}
                    className='text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1 rounded-lg transition shrink-0'>
                    Encerrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      {aba === 'logs' && (
        <div className={`${card} max-w-2xl`} style={cardStyle}>
          <h2 className='font-bold text-lg mb-4' style={{ color: 'var(--text-main)' }}>Histórico de Acessos</h2>
          {logs.length === 0 ? (
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Nenhum registro encontrado.</p>
          ) : (
            <div className='divide-y' style={{ borderColor: 'var(--border-color)' }}>
              {logs.map((l, i) => (
                <div key={i} className='py-3 flex items-center gap-3'>
                  <span className='text-base w-6 text-center shrink-0'>{actionLabel[l.action]?.split(' ')[0] || '🔹'}</span>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium' style={{ color: 'var(--text-main)' }}>{actionLabel[l.action]?.slice(2) || l.action}</p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>IP: {l.ip} · {formatDate(l.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sair */}
      <div className='mt-8 max-w-lg'>
        <button onClick={logout}
          className='w-full rounded-2xl p-4 border border-red-500/30 text-red-500 font-semibold hover:bg-red-500/10 transition text-sm'
          style={{ background: 'var(--bg-card)' }}>
          Sair da Conta
        </button>
      </div>
    </>
  )
}
