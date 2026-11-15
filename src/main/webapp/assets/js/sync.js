/* =========================================================
   Đồng bộ & chạy như app trên điện thoại
   - Hàng đợi thay đổi khi mất mạng (lưu ở localStorage, tự gửi lại khi có mạng)
   - Trạng thái đồng bộ, kéo xuống để làm mới, cài app (PWA), service worker
   Dùng các hàm của app.js lúc chạy: $, toast, refresh, view.
   ========================================================= */
const Sync = (() => {
    const KEY = 'sb.outbox';
    let outbox = [];
    try { outbox = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { outbox = []; }
    let offline = false, lastSync = null, flushing = false, holdUntil = 0, installEvt = null;

    const save = () => localStorage.setItem(KEY, JSON.stringify(outbox));
    const isMobile = () => matchMedia('(max-width: 760px)').matches;
    const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    /** Không xếp hàng các lệnh chỉ có nghĩa lúc đang online. */
    const canQueue = (method, path) => method !== 'GET' && !/^(presence|devices)/.test(path);

    function enqueue(method, path, body) {
        outbox.push({ method, path, body: body ?? null, at: Date.now() });
        save();
        holdUntil = Date.now() + 2600;
        toastNow(`📴 Đang ngoại tuyến — đã lưu trên máy, sẽ tự đồng bộ khi có mạng (${outbox.length} thay đổi chờ)`);
        paint();
    }

    function toastNow(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => t.classList.remove('show'), 3200);
    }
    /** app.js gọi trước khi hiện toast thường: giữ thông báo ngoại tuyến đủ lâu để đọc. */
    const holding = () => Date.now() < holdUntil;

    function setOffline(v) {
        if (offline === v) return;
        offline = v;
        paint();
        if (!v) flush();
    }
    function markSynced() {
        lastSync = new Date();
        setOffline(false);
        paint();
    }

    async function flush() {
        if (flushing || !outbox.length || offline) return;
        flushing = true;
        paint();
        let sent = 0;
        try {
            while (outbox.length) {
                const it = outbox[0];
                let res;
                try {
                    res = await fetch('api/' + it.path, {
                        method: it.method,
                        headers: it.body ? { 'Content-Type': 'application/json' } : {},
                        body: it.body ? JSON.stringify(it.body) : undefined
                    });
                } catch (e) {
                    offline = true;
                    break;
                }
                if (res.status >= 500) break;
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    toastNow('Bỏ qua một thay đổi không đồng bộ được: ' + (d.error || 'lỗi ' + res.status));
                }
                outbox.shift();
                save();
                sent++;
            }
        } finally {
            flushing = false;
            paint();
        }
        if (sent && !outbox.length) {
            toastNow(`☁️ Đã đồng bộ ${sent} thay đổi lưu lúc ngoại tuyến`);
            holdUntil = Date.now() + 2000;
            refresh();
        }
    }

    // ---------- Trạng thái đồng bộ ----------
    const hhmm = (d) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    function status() {
        if (flushing) return { cls: 'busy', text: 'Đang đồng bộ…', short: 'Đang đồng bộ' };
        if (offline) return { cls: 'off', text: outbox.length ? `Ngoại tuyến · ${outbox.length} thay đổi chờ` : 'Ngoại tuyến · đang xem dữ liệu đã lưu', short: outbox.length ? `${outbox.length} chờ` : 'Ngoại tuyến' };
        if (outbox.length) return { cls: 'wait', text: `${outbox.length} thay đổi chờ đồng bộ`, short: `${outbox.length} chờ` };
        return { cls: 'ok', text: lastSync ? `Đã đồng bộ lúc ${hhmm(lastSync)}` : 'Đang kết nối…', short: lastSync ? hhmm(lastSync) : '…' };
    }
    function paint() {
        const s = status();
        document.querySelectorAll('[data-sync]').forEach((el) => {
            el.className = `sync-pill ${s.cls} ${el.dataset.sync}`;
            el.title = s.text + ' — bấm để đồng bộ ngay';
            el.innerHTML = `<i></i><span>${el.dataset.sync === 'short' ? s.short : s.text}</span>`;
        });
        document.documentElement.classList.toggle('is-offline', offline);
    }
    async function syncNow() {
        try {
            await refresh();
            await flush();
        } catch (e) { /* refresh tự báo lỗi */ }
    }

    // ---------- Thanh tab dưới (điện thoại) ----------
    function paintTabs(v) {
        const tab = v.startsWith('f:') ? 'f' : v.startsWith('g:') ? 'g' : v === 'today' ? 'today' : 'menu';
        document.querySelectorAll('#tabbar [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    }

    // ---------- Kéo xuống để làm mới ----------
    function setupPullToRefresh() {
        const main = document.querySelector('.main'), ptr = document.getElementById('ptr');
        if (!main || !ptr) return;
        let y0 = null, dist = 0;
        const reset = () => {
            ptr.style.transform = '';
            ptr.style.opacity = '';
            ptr.classList.remove('ready', 'spin', 'pull');
        };
        main.addEventListener('touchstart', (e) => {
            y0 = main.scrollTop <= 0 && !document.querySelector('dialog[open]') && e.touches.length === 1 ? e.touches[0].clientY : null;
            dist = 0;
        }, { passive: true });
        main.addEventListener('touchmove', (e) => {
            if (y0 === null) return;
            dist = Math.max(0, (e.touches[0].clientY - y0) * 0.5);
            if (!dist) return;
            ptr.classList.add('pull');
            ptr.style.transform = `translate(-50%, ${Math.min(dist, 80)}px) rotate(${dist * 4}deg)`;
            ptr.style.opacity = Math.min(1, dist / 50);
            ptr.classList.toggle('ready', dist > 60);
        }, { passive: true });
        main.addEventListener('touchend', async () => {
            if (y0 === null) return;
            y0 = null;
            if (!ptr.classList.contains('ready')) return reset();
            ptr.classList.add('spin');
            ptr.style.transform = 'translate(-50%, 56px)';
            if (navigator.vibrate) navigator.vibrate(10);
            await syncNow();
            reset();
        });
    }

    // ---------- Cài app ----------
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installEvt = e;
        document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = false; });
    });
    window.addEventListener('appinstalled', () => {
        installEvt = null;
        document.querySelectorAll('[data-install]').forEach((b) => { b.hidden = true; });
        toastNow('📲 Đã cài Second Brain lên màn hình chính');
    });
    async function install() {
        if (installEvt) {
            installEvt.prompt();
            await installEvt.userChoice.catch(() => null);
            installEvt = null;
            return true;
        }
        return false;
    }
    /** Cách cài thủ công khi trình duyệt không có nút cài tự động. */
    function installHelp() {
        if (standalone()) return 'Bạn đang dùng bản đã cài trên màn hình chính.';
        if (isIOS()) return 'Trên iPhone/iPad: mở bằng <b>Safari</b>, bấm nút <b>Chia sẻ</b> rồi chọn <b>Thêm vào MH chính</b>.';
        if (!window.isSecureContext) return 'Trên Android: bấm menu <b>⋮</b> của Chrome → <b>Thêm vào màn hình chính</b>. Muốn dùng khi mất mạng cần mở qua HTTPS (xem hướng dẫn Tailscale).';
        return 'Trên Android: bấm menu <b>⋮</b> của Chrome → <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>).';
    }

    // ---------- Khởi động ----------
    function boot() {
        paint();
        setupPullToRefresh();
        window.addEventListener('online', () => { setOffline(false); syncNow(); });
        window.addEventListener('offline', () => setOffline(true));
        document.addEventListener('click', (e) => {
            const s = e.target.closest('[data-sync]');
            if (s) { e.stopPropagation(); syncNow(); }
            const i = e.target.closest('[data-install]');
            if (i) install();
        });
        if ('serviceWorker' in navigator && window.isSecureContext) {
            navigator.serviceWorker.register('sw.js').catch(() => { /* trình duyệt chặn — app vẫn chạy online */ });
        }
        if (standalone()) document.documentElement.classList.add('standalone');
        setInterval(() => { if (!document.hidden) paint(); }, 30000);
    }

    /** Xoá dữ liệu API đã lưu (khi đổi tài khoản trên thiết bị). */
    async function clearCache() {
        outbox = [];
        save();
        if (window.caches) await caches.delete('sb-api').catch(() => null);
    }

    return {
        canQueue, enqueue, setOffline, markSynced, flush, holding, paint, paintTabs, boot,
        install, installHelp, clearCache, isMobile, isIOS, standalone, syncNow,
        get offline() { return offline; }, get pending() { return outbox.length; }
    };
})();
