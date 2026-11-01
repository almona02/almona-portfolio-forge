/* Compatibility guard for clients that still contain older auto-reload listeners. */
self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'ALMONA_CAN_ACTIVATE' || !event.ports[0]) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    // A worker cannot inspect another tab's unsaved state. Be conservative.
    event.ports[0].postMessage({ safe: clients.length <= 1 });
  }).catch(function () { event.ports[0].postMessage({ safe: false }); }));
});
