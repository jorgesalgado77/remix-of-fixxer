// FIXXER Service Worker — Push Notifications + ações do agendamento
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "FIXXER", body: "Nova notificação", url: "/dashboard", tag: "fixxer-generic" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag,
    renotify: true,
    data: { url: data.url || "/dashboard", appointmentId: data.appointmentId || null },
    vibrate: [100, 50, 100],
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

function resolveActionUrl(notif, action) {
  const base = notif.data?.url || "/dashboard";
  const apptId = notif.data?.appointmentId;
  // Se houver ação e appointmentId, roteia para a página de detalhes com ?action=…
  if (action && apptId && (action === "reschedule" || action === "cancel")) {
    return `/agenda/${apptId}?action=${action}`;
  }
  if (action === "open" && apptId) return `/agenda/${apptId}`;
  return base;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveActionUrl(event.notification, event.action);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
