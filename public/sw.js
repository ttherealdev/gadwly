self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = { title: "جدولي", body: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const { title, ...options } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: options.body,
      icon: options.icon ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: options.tag,
      silent: options.silent ?? false,
      data: { url: options.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client)
            return client.focus();
        }
        if (clients.length > 0 && "focus" in clients[0]) {
          return clients[0]
            .focus()
            .then(() => clients[0].navigate?.(targetUrl));
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
