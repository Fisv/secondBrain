/* Service worker của Second Brain.
 * - Giao diện (HTML/CSS/JS/icon) được lưu sẵn để app mở được cả khi mất mạng.
 * - API GET: ưu tiên mạng, lưu bản sao; mất mạng thì trả bản đã lưu kèm header X-SB-Offline.
 * - API ghi (POST/PUT/PATCH/DELETE) không đi qua cache: trang tự xếp hàng và gửi lại khi có mạng.
 */
const VERSION = 'sb-shell-v1';
const API_CACHE = 'sb-api';
const SHELL = [
    './',
    'assets/css/app.css',
    'assets/js/sync.js',
    'assets/js/devices.js',
    'assets/js/finance.js',
    'assets/js/gym.js',
    'assets/js/app.js',
    'assets/vendor/qrcode.js',
    'manifest.webmanifest',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/apple-touch-icon.png',
    'assets/icons/favicon-64.png'
];
const TIMEOUT_MS = 5000;

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== API_CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

/** Mạng trước, quá thời gian hoặc lỗi thì dùng bản lưu. */
function networkFirst(req, cacheName, fallbackUrl) {
    return new Promise((resolve) => {
        let settled = false;
        const fromCache = async () => {
            const cache = await caches.open(cacheName);
            const hit = (await cache.match(req)) || (fallbackUrl && (await cache.match(fallbackUrl)));
            return hit || null;
        };
        const timer = setTimeout(async () => {
            const hit = await fromCache();
            if (hit && !settled) { settled = true; resolve(markOffline(hit, cacheName)); }
        }, TIMEOUT_MS);
        fetch(req).then(async (res) => {
            clearTimeout(timer);
            if (res.ok) {
                const copy = res.clone();
                caches.open(cacheName).then((c) => c.put(req, copy));
            }
            if (!settled) { settled = true; resolve(res); }
        }).catch(async () => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;
            const hit = await fromCache();
            resolve(hit ? markOffline(hit, cacheName) : offlineResponse(req));
        });
    });
}

function markOffline(res, cacheName) {
    if (cacheName !== API_CACHE) return res;
    const headers = new Headers(res.headers);
    headers.set('X-SB-Offline', '1');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function offlineResponse(req) {
    if (new URL(req.url).pathname.includes('/api/')) {
        return new Response(JSON.stringify({ error: 'Đang ngoại tuyến và chưa có dữ liệu lưu sẵn' }), {
            status: 503, headers: { 'Content-Type': 'application/json;charset=UTF-8', 'X-SB-Offline': '1' }
        });
    }
    return new Response('Đang ngoại tuyến', { status: 503, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } });
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;
    const scope = new URL(self.registration.scope).pathname;
    if (!url.pathname.startsWith(scope)) return;
    if (url.pathname.startsWith(scope + 'api/')) {
        e.respondWith(networkFirst(req, API_CACHE));
    } else if (req.mode === 'navigate') {
        e.respondWith(networkFirst(req, VERSION, './'));
    } else {
        e.respondWith(networkFirst(req, VERSION));
    }
});

self.addEventListener('message', (e) => {
    if (e.data === 'clear-api') e.waitUntil(caches.delete(API_CACHE));
});
