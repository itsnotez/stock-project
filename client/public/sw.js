self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '경제 뉴스';
  const options = {
    body: data.body || '오늘의 경제 뉴스가 준비됐습니다.',
    icon: '/favicon.ico',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
