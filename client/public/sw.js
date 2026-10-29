// Lets the website be installed like an app. It does not cache anything, so visitors always get the
// newest version of the site; it only needs to exist for phones to offer "Add to Home screen".
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
