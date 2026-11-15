/* =========================================================
   Kết nối thiết bị — ghép điện thoại với máy tính bằng mã QR / mã 8 ký tự
   Dùng các hàm của app.js lúc chạy: api, esc, toast, state, refresh, ICON.
   ========================================================= */
const Devices = (() => {
    const IC = {
        phone: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 17.5h2"/></svg>',
        laptop: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/></svg>',
        tablet: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 17.5h2"/></svg>',
        qr: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>',
        key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/></svg>',
        edit: '<svg viewBox="0 0 24 24"><path d="M5 19h4L19 9l-4-4L5 15z"/></svg>',
        copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/></svg>',
        ok: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/></svg>',
        cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 17.5 18z"/></svg>',
        download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>'
    };

    let tab = 'show';            // 'show' (hiện mã cho thiết bị khác) | 'join' (nhập mã từ máy khác)
    let pair = null;             // {code, ttl, urls, until}
    let urlIdx = 0;
    let list = { devices: [], current: null };
    let pollTimer = null, tickTimer = null, knownCount = 0, justPaired = null;

    const dlg = () => document.getElementById('devDialog');
    const body = () => document.getElementById('devBody');

    // ---------- Tên thiết bị ----------
    function guessName() {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return 'iPhone';
        if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
        const m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/);
        if (/Android/.test(ua)) return m && !/^K$|wv/.test(m[1]) ? `Android · ${m[1].trim()}` : 'Điện thoại Android';
        const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Máy tính';
        const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
        return `${br} · ${os}`;
    }
    const iconFor = (name) => (/iphone|android|điện thoại|phone/i.test(name) ? IC.phone : /ipad|tablet/i.test(name) ? IC.tablet : IC.laptop);

    function agoText(s) {
        if (s == null) return '';
        if (s < 90) return 'Đang hoạt động';
        if (s < 3600) return `Hoạt động ${Math.round(s / 60)} phút trước`;
        if (s < 86400) return `Hoạt động ${Math.round(s / 3600)} giờ trước`;
        return `Hoạt động ${Math.round(s / 86400)} ngày trước`;
    }

    // ---------- QR ----------
    function qrSvg(text) {
        const q = qrcode(0, 'M');
        q.addData(text);
        q.make();
        const n = q.getModuleCount();
        let d = '';
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
        }
        return `<svg class="qr" viewBox="-3 -3 ${n + 6} ${n + 6}" shape-rendering="crispEdges" role="img" aria-label="Mã QR">
            <rect x="-3" y="-3" width="${n + 6}" height="${n + 6}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
    }
    const pairUrl = () => {
        const u = pair.urls[urlIdx];
        return u ? `${u.url}#pair=${pair.code.replace('-', '')}` : '';
    };

    // ---------- Mở / đóng ----------
    async function open(startTab) {
        tab = startTab || (Sync.isMobile() && !state.me?.device ? 'join' : 'show');
        justPaired = null;
        dlg().showModal();
        await loadList();
        knownCount = list.devices.length;
        if (tab === 'show') await newCode(); else paint();
        clearInterval(pollTimer);
        pollTimer = setInterval(poll, 2500);
    }
    function onClose() {
        clearInterval(pollTimer);
        clearInterval(tickTimer);
        if (pair) api('DELETE', 'devices/pair').catch(() => null);
        pair = null;
    }

    async function loadList() {
        try { list = await api('GET', 'devices'); } catch (e) { /* hiện danh sách cũ */ }
    }
    async function newCode() {
        try {
            pair = await api('POST', 'devices/pair');
            pair.until = Date.now() + pair.ttl * 1000;
            const saved = localStorage.getItem('sb.pairKind');
            const i = pair.urls.findIndex((u) => u.kind === saved);
            urlIdx = i >= 0 ? i : 0;
        } catch (e) {
            pair = { error: e.message };
        }
        justPaired = null;
        paint();
        clearInterval(tickTimer);
        tickTimer = setInterval(tick, 1000);
    }
    function tick() {
        const el = document.getElementById('pairTtl');
        if (!el || !pair?.until) return;
        const left = Math.max(0, Math.round((pair.until - Date.now()) / 1000));
        el.textContent = left ? `Hết hạn sau ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Mã đã hết hạn';
        if (!left) { clearInterval(tickTimer); paint(); }
    }
    async function poll() {
        if (!dlg().open) return;
        const before = new Set(list.devices.map((d) => d.id));
        await loadList();
        const added = list.devices.filter((d) => !before.has(d.id) && !d.current);
        if (added.length && tab === 'show') {
            justPaired = added[added.length - 1];
            pair = null;
            clearInterval(tickTimer);
            toast(`📱 Đã kết nối ${justPaired.name}`);
            refresh();
        }
        if (added.length || list.devices.length !== knownCount) {
            knownCount = list.devices.length;
            paint();
        } else {
            // chỉ cập nhật dòng "hoạt động … trước"
            list.devices.forEach((d) => {
                const el = document.querySelector(`[data-dev-seen="${d.id}"]`);
                if (el) el.textContent = agoText(d.lastSeenAgo);
            });
        }
    }

    // ---------- Vẽ ----------
    function paint() {
        const me = state.me || {};
        const paired = !!me.device;
        const head = `<div class="dev-head"><div><h3>Kết nối thiết bị</h3>
                <p class="muted">Dùng chung tài khoản <b>${esc(me.name || '')}</b> trên điện thoại và máy tính — dữ liệu tự đồng bộ qua máy chủ.</p></div>
                <button type="button" class="icon-btn" data-dev="close" title="Đóng"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>
            <div class="seg wide dev-tabs"><button class="${tab === 'show' ? 'on' : ''}" data-dev="tab" data-v="show">${IC.qr}Hiện mã kết nối</button>
                <button class="${tab === 'join' ? 'on' : ''}" data-dev="tab" data-v="join">${IC.key}Nhập mã từ máy khác</button></div>`;
        body().innerHTML = head + (tab === 'show' ? showHtml() : joinHtml(paired)) + devicesHtml() + installHtml();
        tick();
        if (tab === 'join') setTimeout(() => document.getElementById('joinCode')?.focus(), 30);
    }

    function showHtml() {
        if (justPaired) {
            return `<div class="dev-success">${IC.ok}<div><b>Đã kết nối ${esc(justPaired.name)}</b>
                <p class="muted">Mọi thay đổi trên thiết bị này sẽ hiện trên máy tính trong vài giây và ngược lại.</p>
                <button type="button" class="ghost-btn" data-dev="new">${IC.qr}Kết nối thêm thiết bị</button></div></div>`;
        }
        if (!pair) return '<div class="dev-qr-wrap"><p class="muted">Đang tạo mã…</p></div>';
        if (pair.error) return `<p class="error">${esc(pair.error)}</p>`;
        const expired = pair.until <= Date.now();
        const u = pair.urls[urlIdx];
        if (!u) {
            return `<p class="hint">${ICON.bolt}<span>Không tìm thấy địa chỉ mạng nào của máy tính. Hãy kết nối Wi-Fi rồi bấm “Tạo mã mới”.</span></p>
                <button type="button" class="ghost-btn" data-dev="new">Tạo mã mới</button>`;
        }
        const http = u.url.startsWith('http:');
        const choices = pair.urls.length > 1 ? `<label class="field"><span>Điện thoại mở máy tính qua</span>
            <select data-dev="url">${pair.urls.map((x, i) => `<option value="${i}" ${i === urlIdx ? 'selected' : ''}>${esc(x.label)} — ${esc(x.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</option>`).join('')}</select></label>` : '';
        return `<div class="dev-pair">
            <div class="dev-qr-wrap ${expired ? 'expired' : ''}">${qrSvg(pairUrl())}
                ${expired ? `<button type="button" class="primary-btn" data-dev="new">Tạo mã mới</button>` : ''}</div>
            <div class="dev-steps">
                <ol>
                    <li>Mở <b>Camera</b> trên điện thoại và quét mã QR.</li>
                    <li>Hoặc mở <b class="mono sel">${esc(u.url)}</b> rồi nhập mã:</li>
                </ol>
                <div class="pair-code mono">${esc(pair.code)}</div>
                <div class="pair-meta"><span id="pairTtl"></span><button type="button" class="link" data-dev="new">Tạo mã mới</button>
                    <button type="button" class="link" data-dev="copy">${IC.copy}Sao chép link</button></div>
                ${choices}
                <p class="hint-s">${u.kind === 'https' ? 'Địa chỉ HTTPS: cài được app lên màn hình chính và xem dữ liệu khi mất mạng. Với Tailscale, điện thoại cần cài app Tailscale cùng tài khoản.' : u.kind === 'tailscale'
                    ? 'Điện thoại cần cài app <b>Tailscale</b> và đăng nhập cùng tài khoản — dùng được cả khi không ở nhà.'
                    : u.kind === 'current' ? 'Điện thoại mở cùng địa chỉ bạn đang dùng.'
                        : 'Điện thoại cần bắt <b>cùng mạng Wi-Fi</b> với máy tính. Nếu không mở được, hãy cho phép Java/Tomcat qua Windows Firewall.'}
                    ${http ? ' Kết nối qua http vẫn đồng bộ bình thường; để <b>cài app và dùng khi mất mạng</b> cần HTTPS (Tailscale Serve).' : ''}</p>
            </div></div>`;
    }

    function joinHtml(paired) {
        const hasData = (state.projects?.length || 0) > 0 || (state.stats?.open || 0) > 0;
        return `<form class="dev-join" id="joinForm">
            <p class="muted">Trên máy tính, mở <b>Kết nối thiết bị → Hiện mã kết nối</b>, rồi nhập mã 8 ký tự hiện ra.</p>
            <label class="field"><span>Mã kết nối</span><input id="joinCode" class="mono code-in" maxlength="9" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" required></label>
            <label class="field"><span>Tên thiết bị này</span><input id="joinName" maxlength="60" value="${esc(state.me?.device?.name || guessName())}"></label>
            ${paired ? '<p class="hint-s">Thiết bị này đang kết nối với một tài khoản. Nhập mã mới sẽ chuyển sang tài khoản kia.</p>'
                : hasData ? '<p class="hint-s">Dữ liệu đang có trên thiết bị này sẽ được giữ nguyên nhưng ẩn đi; bấm “Ngắt kết nối” sau này để thấy lại.</p>' : ''}
            <p class="error" id="joinError"></p>
            <button class="primary-btn" type="submit">${IC.cloud}Kết nối &amp; đồng bộ</button></form>`;
    }

    function devicesHtml() {
        const me = state.me || {};
        const rows = list.devices.map((d) => `<div class="dev-row ${d.current ? 'cur' : ''}">
            <span class="dev-ic">${iconFor(d.name)}</span>
            <span class="dev-info"><b class="ellipsis">${esc(d.name)}${d.current ? ' <span class="chip">Thiết bị này</span>' : ''}</b>
                <small data-dev-seen="${esc(d.id)}">${agoText(d.lastSeenAgo)}</small></span>
            <button type="button" class="icon-btn small" data-dev="rename" data-id="${esc(d.id)}" title="Đổi tên">${IC.edit}</button>
            <button type="button" class="icon-btn small danger" data-dev="revoke" data-id="${esc(d.id)}" title="${d.current ? 'Ngắt kết nối' : 'Thu hồi'}">${ICON.trash}</button></div>`).join('');
        const self = !me.device ? `<div class="dev-row cur"><span class="dev-ic">${iconFor(guessName())}</span>
            <span class="dev-info"><b>${esc(guessName())} <span class="chip">Thiết bị này</span></b><small>Thiết bị gốc của tài khoản</small></span></div>` : '';
        return `<div class="sec-label dev-sec">Thiết bị đang dùng tài khoản này</div><div class="dev-list">${self}${rows ||
            (self ? '' : '<p class="muted">Chưa có thiết bị nào khác.</p>')}</div>
            ${me.device ? `<button type="button" class="ghost-btn danger" data-dev="leave">Ngắt kết nối thiết bị này</button>` : ''}`;
    }

    function installHtml() {
        const btn = `<button type="button" class="ghost-btn" data-install hidden>${IC.download}Cài app</button>`;
        return `<div class="dev-install"><span class="dev-ic">${IC.download}</span><p>${Sync.installHelp()}</p>${btn}</div>`;
    }

    // ---------- Ghép ----------
    async function claim(code, name) {
        const res = await fetch('api/devices/claim', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name: name || guessName() })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lỗi ' + res.status);
        await Sync.clearCache();
        return data;
    }

    /** Mở từ QR: …/#pair=ABCD2345 → ghép ngay rồi tải dữ liệu. */
    async function handlePairHash() {
        const m = location.hash.match(/pair=([A-Za-z0-9-]{8,9})/);
        if (!m) return false;
        history.replaceState(null, '', location.pathname + location.search);
        try {
            const r = await claim(m[1]);
            setTimeout(() => toast(`✅ Đã kết nối với tài khoản ${r.name} — dữ liệu đang được đồng bộ`), 600);
            return true;
        } catch (e) {
            setTimeout(async () => {
                await open('join');
                const inp = document.getElementById('joinCode');
                if (inp) inp.value = m[1].toUpperCase().replace(/^(.{4})-?/, '$1-');
                document.getElementById('joinError').textContent = e.message;
            }, 300);
            return false;
        }
    }

    /** Lần đầu mở trên điện thoại mà tài khoản còn trống → gợi ý ghép với máy tính. */
    function maybeOnboard() {
        const me = state.me;
        if (!me || me.device || me.devices || !Sync.isMobile() || localStorage.getItem('sb.onboarded')) return;
        if (state.projects.length || state.stats?.open || state.stats?.weekDone) return;
        localStorage.setItem('sb.onboarded', '1');
        const f = document.getElementById('finForm');
        f.innerHTML = `<div class="onboard"><span class="onboard-ic">${IC.cloud}</span><h3>Đồng bộ với máy tính?</h3>
            <p class="muted">Nếu bạn đã dùng Second Brain trên máy tính, hãy kết nối để thấy cùng mục tiêu, sổ thu chi và nhật ký tập trên điện thoại.</p>
            <div class="dialog-actions col"><button value="ok" class="primary-btn">${IC.qr}Kết nối với máy tính</button>
            <button value="cancel" class="ghost-btn">Dùng riêng trên điện thoại</button></div></div>`;
        f.onsubmit = (e) => {
            if (e.submitter?.value === 'ok') { e.preventDefault(); document.getElementById('finDialog').close(); open('join'); }
        };
        document.getElementById('finDialog').showModal();
    }

    // ---------- Sự kiện ----------
    document.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-dev]');
        if (!b || !b.closest('#devDialog') || b.tagName === 'SELECT') return;
        const a = b.dataset.dev, id = b.dataset.id;
        try {
            if (a === 'close') dlg().close();
            else if (a === 'tab') {
                tab = b.dataset.v;
                if (tab === 'show' && (!pair || pair.until <= Date.now())) await newCode(); else paint();
            } else if (a === 'new') await newCode();
            else if (a === 'copy') {
                await navigator.clipboard.writeText(pairUrl());
                toast('Đã sao chép link kết nối');
            } else if (a === 'rename') {
                const d = list.devices.find((x) => x.id === id);
                const name = prompt('Tên thiết bị:', d?.name || '');
                if (!name || !name.trim()) return;
                await api('PATCH', 'devices/' + id, { name: name.trim() });
                await loadList();
                if (d?.current) state.me = await api('GET', 'me');
                paint();
            } else if (a === 'revoke') {
                const d = list.devices.find((x) => x.id === id);
                if (d?.current) return leave();
                if (!confirm(`Thu hồi “${d?.name}”? Thiết bị đó sẽ không xem được dữ liệu của bạn nữa.`)) return;
                await api('DELETE', 'devices/' + id);
                await loadList();
                knownCount = list.devices.length;
                paint();
                toast('Đã thu hồi thiết bị');
            } else if (a === 'leave') await leave();
        } catch (err) {
            toast(err.message);
        }
    });
    async function leave() {
        if (!confirm('Ngắt kết nối thiết bị này khỏi tài khoản? Dữ liệu vẫn còn trên máy chủ và các thiết bị khác.')) return;
        await api('POST', 'devices/leave');
        await Sync.clearCache();
        dlg().close();
        state.me = await api('GET', 'me');
        await refresh();
        toast('Đã ngắt kết nối thiết bị này');
    }
    document.addEventListener('change', (e) => {
        if (e.target.dataset?.dev !== 'url') return;
        urlIdx = +e.target.value;
        localStorage.setItem('sb.pairKind', pair.urls[urlIdx].kind);
        paint();
    });
    document.addEventListener('input', (e) => {
        if (e.target.id !== 'joinCode') return;
        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        e.target.value = raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw;
    });
    document.addEventListener('submit', async (e) => {
        if (e.target.id !== 'joinForm') return;
        e.preventDefault();
        const err = document.getElementById('joinError'), btn = e.target.querySelector('button[type=submit]');
        err.textContent = '';
        btn.disabled = true;
        try {
            const r = await claim(document.getElementById('joinCode').value, document.getElementById('joinName').value.trim());
            dlg().close();
            state.me = await api('GET', 'me');
            await refresh();
            toast(`✅ Đã kết nối với tài khoản ${r.name}`);
        } catch (ex) {
            err.textContent = ex.message;
        } finally {
            btn.disabled = false;
        }
    });

    function boot() {
        dlg().addEventListener('close', onClose);
        dlg().addEventListener('click', (e) => { if (e.target === dlg()) dlg().close(); });
    }

    return { open, handlePairHash, maybeOnboard, guessName, boot };
})();
