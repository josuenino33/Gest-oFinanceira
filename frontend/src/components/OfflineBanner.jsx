import { useEffect, useState } from 'react'
import { getQueue, removeFromQueue } from '../utils/offlineQueue'
import api from '../utils/api'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(getQueue().length)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const syncQueue = async () => {
    const queue = getQueue()
    if (queue.length === 0) return
    setSyncing(true)
    let synced = 0
    for (const op of queue) {
      try {
        await api.request({ method: op.method, url: op.url, data: op.data })
        removeFromQueue(op.id)
        synced++
      } catch {}
    }
    setSyncing(false)
    setPending(getQueue().length)
    if (synced > 0) {
      setJustSynced(true)
      window.dispatchEvent(new CustomEvent('data-synced'))
      setTimeout(() => setJustSynced(false), 3000)
    }
  }

  useEffect(() => {
    const onOnline = () => { setOnline(true); syncQueue() }
    const onOffline = () => setOnline(false)
    const onQueueUpdate = (e) => setPending(e.detail?.count ?? getQueue().length)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('offline-queue-update', onQueueUpdate)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('offline-queue-update', onQueueUpdate)
    }
  }, [])

  if (online && pending === 0 && !justSynced) return null

  return (
    <div className='fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none'>
      <div className={`mt-2 px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg flex items-center gap-2 pointer-events-auto transition-all ${
        !online ? 'bg-orange-500 text-white' :
        syncing ? 'bg-blue-500 text-white' :
        justSynced ? 'bg-green-500 text-white' :
        'bg-yellow-500 text-black'
      }`}>
        {!online && <><span>📵</span><span>Sem internet — dados serão enviados ao conectar</span></>}
        {online && syncing && <><span className='animate-spin'>🔄</span><span>Sincronizando {pending} registro{pending !== 1 ? 's' : ''}...</span></>}
        {online && !syncing && justSynced && <><span>✅</span><span>Dados sincronizados!</span></>}
        {online && !syncing && !justSynced && pending > 0 && (
          <><span>⏳</span><span>{pending} registro{pending !== 1 ? 's' : ''} pendente{pending !== 1 ? 's' : ''}</span>
          <button onClick={syncQueue} className='ml-2 underline text-xs'>Sincronizar agora</button></>
        )}
      </div>
    </div>
  )
}
