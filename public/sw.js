self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "דירה חדשה!", body: event.data.text() }; }
  const title = data.title || "🏠 דירה חדשה!";
  const options = {
    body: data.body || "לחץ לצפייה",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl", lang: "he",
    tag: data.tag || "apt",
    renotify: true,
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
