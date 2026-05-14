const CACHE = 'financas-v3'

self.addEventListener('install', () => {
  // Ativa imediatamente sem esperar aba fechar
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // Remove todos os caches antigos na ativação
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  // Chamadas de API sempre vão para a rede, nunca cache
  if (e.request.url.includes(':5000') || e.request.url.includes('/api/')) return

  // Network-first: busca na rede primeiro; só usa cache se estiver offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Guarda no cache apenas respostas válidas
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return response
      })
      .catch(() => caches.match(e.request))
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'Minhas Finanças', body: 'Você tem notificações pendentes.' }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'financas-notif'
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
