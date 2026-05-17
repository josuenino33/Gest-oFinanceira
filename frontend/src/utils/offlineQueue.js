const QUEUE_KEY = 'offline_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

export function addToQueue(op) {
  const queue = getQueue()
  queue.push({ ...op, id: `${Date.now()}_${Math.random()}`, timestamp: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: queue.length } }))
}

export function removeFromQueue(id) {
  const queue = getQueue().filter(op => op.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: queue.length } }))
}

export function getPendingCount() {
  return getQueue().length
}
