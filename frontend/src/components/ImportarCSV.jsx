import { useRef, useState } from 'react'
import api from '../utils/api'
import Modal from './Modal'
import { useToast } from '../context/ToastContext'

const COLUNAS_POSSIVEIS = {
  descricao: ['descricao', 'descrição', 'description', 'historico', 'histórico', 'memo', 'lancamento', 'lançamento', 'estabelecimento'],
  valor: ['valor', 'value', 'amount', 'montante', 'quantia', 'debito', 'débito', 'credito', 'crédito'],
  data: ['data', 'date', 'criado_em', 'data_lancamento', 'data_transacao', 'dt'],
}

function detectarColuna(headers, tipo) {
  const h = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
  const alvos = COLUNAS_POSSIVEIS[tipo].map(t => t.replace(/[^a-z0-9]/g, ''))
  for (const alvo of alvos) {
    const idx = h.findIndex(x => x.includes(alvo) || alvo.includes(x))
    if (idx !== -1) return idx
  }
  return -1
}

function parsearCSV(texto) {
  const sep = texto.includes(';') ? ';' : ','
  const linhas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (linhas.length < 2) return { headers: [], rows: [] }
  const headers = linhas[0].split(sep).map(h => h.replace(/^["']|["']$/g, '').trim())
  const rows = linhas.slice(1).map(l =>
    l.split(sep).map(c => c.replace(/^["']|["']$/g, '').trim())
  ).filter(r => r.some(c => c))
  return { headers, rows }
}

function parsearValor(str) {
  if (!str) return null
  const limpo = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpo)
  return isNaN(n) ? null : Math.abs(n)
}

function parsearData(str) {
  if (!str) return null
  // DD/MM/YYYY ou DD-MM-YYYY
  const m1 = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]} 12:00:00`
  // YYYY-MM-DD
  const m2 = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]} 12:00:00`
  return null
}

export default function ImportarCSV({ tipo, onImportado }) {
  const toast = useToast()
  const inputRef = useRef()
  const [modalOpen, setModalOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [mapeamento, setMapeamento] = useState({ descricao: -1, valor: -1, data: -1 })
  const [loading, setLoading] = useState(false)

  const label = tipo === 'receitas' ? 'Receitas' : 'Despesas'

  const abrirArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target.result
      const { headers, rows } = parsearCSV(texto)
      if (!headers.length) { toast('Arquivo inválido ou vazio.', 'error'); return }
      const map = {
        descricao: detectarColuna(headers, 'descricao'),
        valor: detectarColuna(headers, 'valor'),
        data: detectarColuna(headers, 'data'),
      }
      setMapeamento(map)
      setPreview({ headers, rows: rows.slice(0, 200) })
      setModalOpen(true)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const registrosMapeados = preview ? preview.rows.map(row => ({
    descricao: mapeamento.descricao >= 0 ? row[mapeamento.descricao] : '',
    valor: mapeamento.valor >= 0 ? parsearValor(row[mapeamento.valor]) : null,
    criado_em: mapeamento.data >= 0 ? parsearData(row[mapeamento.data]) : null,
  })).filter(r => r.descricao && r.valor > 0) : []

  const importar = async () => {
    if (!registrosMapeados.length) { toast('Nenhum registro válido encontrado.', 'warning'); return }
    setLoading(true)
    try {
      const res = await api.post(`/importar/${tipo}`, { registros: registrosMapeados })
      toast(`${res.data.inseridos} registros importados com sucesso!`, 'success')
      setModalOpen(false)
      setPreview(null)
      onImportado?.()
    } catch {
      toast('Erro ao importar. Verifique o arquivo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fmt = v => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

  return (
    <>
      <input ref={inputRef} type='file' accept='.csv,.txt' className='hidden' onChange={abrirArquivo} />
      <button onClick={() => inputRef.current?.click()}
        className='border px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition'
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
        ⬆ Importar CSV
      </button>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setPreview(null) }}
        title={`Importar ${label} — ${registrosMapeados.length} registros válidos`}>
        <div className='space-y-4'>

          {/* Mapeamento de colunas */}
          <div className='grid grid-cols-3 gap-3'>
            {['descricao', 'valor', 'data'].map(campo => (
              <div key={campo} className='space-y-1'>
                <label className='text-[10px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>
                  {campo === 'descricao' ? 'Descrição' : campo === 'valor' ? 'Valor' : 'Data'}
                </label>
                <select value={mapeamento[campo]} onChange={e => setMapeamento(p => ({ ...p, [campo]: Number(e.target.value) }))}
                  className='w-full rounded-xl border px-3 py-2 text-xs outline-none'
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                  <option value={-1}>— Ignorar —</option>
                  {preview?.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className='rounded-xl border overflow-auto max-h-64' style={{ borderColor: 'var(--border-color)' }}>
            <table className='w-full text-xs min-w-[400px]'>
              <thead>
                <tr className='border-b' style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  <th className='p-2 text-left'>Descrição</th>
                  <th className='p-2 text-left'>Valor</th>
                  <th className='p-2 text-left'>Data</th>
                </tr>
              </thead>
              <tbody>
                {registrosMapeados.slice(0, 10).map((r, i) => (
                  <tr key={i} className='border-b' style={{ borderColor: 'var(--border-color)' }}>
                    <td className='p-2' style={{ color: 'var(--text-main)' }}>{r.descricao || '—'}</td>
                    <td className='p-2 font-bold' style={{ color: tipo === 'receitas' ? 'var(--color-green)' : '#f87171' }}>{fmt(r.valor)}</td>
                    <td className='p-2' style={{ color: 'var(--text-muted)' }}>{r.criado_em ? r.criado_em.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {registrosMapeados.length > 10 && (
              <p className='text-center py-2 text-xs' style={{ color: 'var(--text-muted)' }}>
                + {registrosMapeados.length - 10} registros adicionais
              </p>
            )}
          </div>

          <button onClick={importar} disabled={loading || !registrosMapeados.length}
            className='w-full bg-green-500 text-black rounded-2xl py-4 font-black uppercase tracking-widest hover:bg-green-400 transition disabled:opacity-50'>
            {loading ? 'Importando...' : `Importar ${registrosMapeados.length} registros`}
          </button>
        </div>
      </Modal>
    </>
  )
}
