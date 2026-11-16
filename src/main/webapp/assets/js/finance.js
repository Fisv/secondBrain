/* =========================================================
   Tài chính — sổ thu chi cá nhân (dựa trên "Sổ Thu Chi")
   Dùng chung các hàm của app.js: api, $, esc, toast, ICON, todayIso, view, render.
   ========================================================= */
const Fin = (() => {
    // ---------- Danh mục ----------
    const SVG = {
        utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11"/>',
        car: '<path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v2M19 16v2"/><circle cx="8" cy="13.5" r=".8"/><circle cx="16" cy="13.5" r=".8"/>',
        home: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
        zap: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
        book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
        bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        film: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4"/>',
        heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
        dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
        board: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 20l3-4 3 4"/>',
        users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16 13.6c2.3-.2 4.1 1.3 4.6 4"/>',
        briefcase: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16"/>',
        award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
        gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>',
        target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
        shield: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/>',
        laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
        plane: '<path d="M10 14l-6-2 1-2 7 1 4-5a1.5 1.5 0 0 1 2 2l-5 4 1 7-2 1-2-6z"/>',
        cap: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
        coins: '<ellipse cx="9" cy="7" rx="5" ry="2.5"/><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"/><path d="M10 15.5c.9 1.2 2.9 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5"/>',
        wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="16" cy="13" r="1"/>',
        trendUp: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
        arrowIn: '<path d="M17 7L7 17M7 9v8h8"/>',
        arrowOut: '<path d="M7 17L17 7M9 7h8v8"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
        swap: '<path d="M5 8h13l-3-3M19 16H6l3 3"/>',
        alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'
    };
    const ic = (name) => `<svg viewBox="0 0 24 24">${SVG[name] || SVG.dots}</svg>`;

    const CATS = [
        { id: 'an', name: 'Ăn uống', type: 'out', icon: 'utensils', hue: 28 },
        { id: 'dichuyen', name: 'Di chuyển', type: 'out', icon: 'car', hue: 200 },
        { id: 'nha', name: 'Nhà ở', type: 'out', icon: 'home', hue: 262 },
        { id: 'hoadon', name: 'Điện thoại & hoá đơn', type: 'out', icon: 'zap', hue: 48 },
        { id: 'hoctap', name: 'Học tập & tài liệu', type: 'out', icon: 'book', hue: 170 },
        { id: 'muasam', name: 'Mua sắm', type: 'out', icon: 'bag', hue: 330 },
        { id: 'giaitri', name: 'Giải trí', type: 'out', icon: 'film', hue: 290 },
        { id: 'suckhoe', name: 'Sức khoẻ', type: 'out', icon: 'heart', hue: 352 },
        { id: 'khac', name: 'Chi khác', type: 'out', icon: 'dots', hue: 230 },
        { id: 'dayhoc', name: 'Dạy thêm', type: 'in', icon: 'board', hue: 228 },
        { id: 'giadinh', name: 'Gia đình gửi', type: 'in', icon: 'users', hue: 185 },
        { id: 'lamthem', name: 'Làm thêm', type: 'in', icon: 'briefcase', hue: 150 },
        { id: 'hocbong', name: 'Học bổng', type: 'in', icon: 'award', hue: 45 },
        { id: 'thuong', name: 'Thưởng & quà', type: 'in', icon: 'gift', hue: 320 },
        { id: 'khacthu', name: 'Thu khác', type: 'in', icon: 'dots', hue: 230 }
    ];
    const cat = (id) => CATS.find((c) => c.id === id) || { id, name: 'Không rõ', type: 'out', icon: 'dots', hue: 230 };
    const catIc = (c, cls = '') => `<span class="cat-ic ${cls}" style="--h:${c.hue}">${ic(c.icon)}</span>`;
    const GOAL_ICONS = ['target', 'shield', 'laptop', 'plane', 'cap', 'home', 'coins', 'wallet', 'gift', 'heart', 'bag', 'trendUp'];
    const goalColor = (g) => `var(--c${(g.color || 0) % 8})`;

    const VIEWS = {
        'f:overview': 'Tổng quan tài chính',
        'f:tx': 'Giao dịch',
        'f:sources': 'Nguồn thu nhập',
        'f:forecast': 'Ước tính thu nhập',
        'f:goals': 'Mục tiêu tài chính'
    };

    // ---------- Trạng thái ----------
    let D = { settings: { opening: 0, budget: 0, catBudgets: {} }, tx: [], sources: [], goals: [], gtx: [] };
    let loaded = false;
    const ui = {
        month: null, txType: 'all', txCat: 'all', q: '', fcN: 6, fcOther: true, fcExp: true, scType: 'src',
        scen: JSON.parse(localStorage.getItem('fin.scen') || '[]')
    };
    const saveScen = () => localStorage.setItem('fin.scen', JSON.stringify(ui.scen));

    async function load() {
        const d = await api('GET', 'finance');
        d.tx.forEach((t) => { t.amount = +t.amount; });
        d.sources.forEach((s) => { s.amount = +s.amount; });
        d.goals.forEach((g) => { g.target = +g.target; });
        d.gtx.forEach((x) => { x.amount = +x.amount; });
        d.settings.opening = +d.settings.opening;
        d.settings.budget = +d.settings.budget;
        D = d;
        loaded = true;
    }

    // ---------- Thời gian & định dạng ----------
    const pad = (n) => String(n).padStart(2, '0');
    const curMonth = () => todayIso().slice(0, 7);
    function addMonths(k, n) {
        const [y, m] = k.split('-').map(Number);
        const t = y * 12 + (m - 1) + n;
        return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
    }
    const daysIn = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
    const monthEnd = (k) => `${k}-${pad(daysIn(k))}`;
    const monthLabel = (k) => `Tháng ${+k.slice(5)}, ${k.slice(0, 4)}`;
    const monthShort = (k) => `T${+k.slice(5)}`;
    const monthSlash = (k) => `${+k.slice(5)}/${k.slice(0, 4)}`;
    const monthTick = (k) => (k.slice(5) === '01' ? `T1/${k.slice(2, 4)}` : monthShort(k));
    function monthsDiff(a, b) {
        const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number);
        return (y2 - y1) * 12 + (m2 - m1);
    }
    function monthsBetween(a, b) {
        const out = [];
        for (let k = a; k <= b && out.length < 240; k = addMonths(k, 1)) out.push(k);
        return out;
    }
    const fmtNum = (n) => Math.round(n).toLocaleString('vi-VN');
    const fmt = (n) => (n < 0 ? '−' : '') + fmtNum(Math.abs(n)) + ' ₫';
    const fmtBig = (n) => `${n < 0 ? '−' : ''}${fmtNum(Math.abs(n))}<span class="cur">₫</span>`;
    const one = (x) => (Math.round(x * 10) / 10).toLocaleString('vi-VN');
    function fmtCompact(n) {
        const a = Math.abs(n), s = n < 0 ? '−' : '';
        if (a >= 1e9) return s + one(a / 1e9) + ' tỷ';
        if (a >= 1e6) return s + one(a / 1e6) + ' tr';
        if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
        return s + a;
    }
    const fmtDM = (d) => `${+d.slice(8, 10)}/${+d.slice(5, 7)}`;
    const fmtDay = (d) => new Date(d + 'T00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const r1000 = (x) => Math.round(x / 1000) * 1000;
    const parseMoney = (s) => {
        const neg = /^\s*[-−]/.test(String(s));
        const n = Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
        return neg ? -n : n;
    };

    // ---------- Tính toán ----------
    function monthStats(k, upto) {
        let inc = 0, out = 0;
        const by = {}, byIn = {};
        for (const t of D.tx) {
            if (t.date.slice(0, 7) !== k) continue;
            if (upto && +t.date.slice(8) > upto) continue;
            if (t.type === 'in') { inc += t.amount; byIn[t.cat] = (byIn[t.cat] || 0) + t.amount; }
            else { out += t.amount; by[t.cat] = (by[t.cat] || 0) + t.amount; }
        }
        return { inc, out, by, byIn };
    }
    function balanceAt(last) {
        let b = D.settings.opening || 0;
        for (const t of D.tx) if (!last || t.date <= last) b += t.type === 'in' ? t.amount : -t.amount;
        return b;
    }

    const srcById = (id) => D.sources.find((s) => s.id === id);
    const srcActive = (s, m) => (s.freq === 'once' ? m === s.from : m >= s.from && (!s.to || m <= s.to));
    const srcReceived = (s, m) => D.tx.filter((t) => t.type === 'in' && t.sourceId === s.id && t.date.slice(0, 7) === m)
        .reduce((a, t) => a + t.amount, 0);
    function srcLine(s, m) {
        if (!srcActive(s, m)) return null;
        const rec = srcReceived(s, m), exp = s.amount, due = `${m}-${pad(Math.min(s.day || 1, daysIn(m)))}`;
        let st;
        if (s.freq === 'irregular') st = rec ? 'nhan' : 'tudo';
        else if (rec >= exp) st = 'du';
        else if (rec > 0) st = 'mot';
        else st = todayIso() > due ? 'tre' : 'cho';
        return { s, m, exp, rec, remain: s.freq === 'irregular' ? 0 : Math.max(0, exp - rec), st, due };
    }
    const SRC_ST = {
        du: ['green', 'Đã nhận'], mot: ['orange', 'Nhận một phần'], tre: ['red', 'Chưa nhận, qua ngày'],
        cho: ['blue', 'Chưa đến ngày'], nhan: ['green', 'Có khoản nhận'], tudo: ['', 'Chưa có khoản nào']
    };
    const srcPill = (st) => `<span class="status ${SRC_ST[st][0]}">${SRC_ST[st][1]}</span>`;
    const lateSources = (m) => D.sources.map((s) => srcLine(s, m)).filter((l) => l && l.st === 'tre');
    const SRC_FREQ = { month: 'Hằng tháng', once: 'Một lần', irregular: 'Không cố định' };
    function srcWhen(s) {
        const end = s.to ? ` · đến hết ${monthSlash(s.to)}` : '';
        const start = s.from > curMonth() ? ` · từ ${monthSlash(s.from)}` : '';
        if (s.freq === 'month') return `Hằng tháng, ngày ${s.day || 1}${start}${end}`;
        if (s.freq === 'once') return `Một lần, ngày ${s.day || 1}/${monthSlash(s.from)}`;
        return `Không cố định, khoảng ${fmtCompact(s.amount)}/tháng${start}${end}`;
    }

    /** Dự báo N tháng kể từ tháng này: nguồn thu khai báo + thu khác trung bình − chi trung bình. */
    function forecast(N, o = {}) {
        const useOther = o.other ?? ui.fcOther, useExp = o.exp ?? ui.fcExp, scens = o.noScen ? [] : ui.scen;
        const cm = curMonth();
        const months = [];
        for (let i = 0; i < N; i++) months.push(addMonths(cm, i));
        const past = [1, 2, 3].map((i) => addMonths(cm, -i)).filter((m) => D.tx.some((t) => t.date.slice(0, 7) === m));
        let oSum = 0, eSum = 0;
        for (const t of D.tx) {
            if (!past.includes(t.date.slice(0, 7))) continue;
            if (t.type === 'in' && !t.sourceId) oSum += t.amount;
            else if (t.type === 'out') eSum += t.amount;
        }
        const otherAvg = past.length ? r1000(oSum / past.length) : 0;
        const expAvg = past.length ? r1000(eSum / past.length) : 0;
        const rows = months.map((m) => {
            const srcBy = {};
            for (const s of D.sources) if (srcActive(s, m)) srcBy[s.id] = s.amount;
            const srcExp = Object.values(srcBy).reduce((a, v) => a + v, 0);
            let scen = 0, cutRaw = 0;
            for (const sc of scens) {
                if (m < sc.from || (sc.to && m > sc.to)) continue;
                if (sc.type === 'src') scen += sc.amount; else cutRaw += sc.amount;
            }
            const avgIn = useOther ? otherAvg : 0;
            const cut = useExp ? Math.min(expAvg, cutRaw) : 0;
            const exp = useExp ? expAvg - cut : 0;
            const total = srcExp + avgIn + scen;
            return { m, srcBy, srcExp, avgIn, scen, cut, exp, total, net: total - exp };
        });
        return { months, rows, otherAvg, expAvg, pastN: past.length };
    }

    /** Số dư dự kiến cuối kỳ dự báo: số dư hiện tại + phần còn vào/ra trong tháng này + các tháng sau. */
    function projectBalance(F) {
        const cm = curMonth(), now = balanceAt(null), ms = monthStats(cm), r0 = F.rows[0];
        const srcRest = D.sources.map((s) => srcLine(s, cm)).filter(Boolean).reduce((a, l) => a + l.remain, 0);
        const unlinked = D.tx.filter((t) => t.type === 'in' && !t.sourceId && t.date.slice(0, 7) === cm).reduce((a, t) => a + t.amount, 0);
        const curRest = srcRest + Math.max(0, r0.avgIn - unlinked) + r0.scen - Math.max(0, r0.exp - ms.out);
        const futureNet = F.rows.slice(1).reduce((a, r) => a + r.net, 0);
        return { now, curRest, futureNet, end: now + curRest + futureNet };
    }

    function goalInfo(g) {
        const cm = curMonth();
        if (g.kind === 'income' || g.kind === 'balance') {
            const dl = g.deadline || cm, passed = dl < cm;
            const F = passed ? null : forecast(Math.min(61, monthsDiff(cm, dl) + 1), { other: true, exp: true, noScen: true });
            let actual = 0, projected = 0;
            if (g.kind === 'income') {
                const months = g.scope === 'range' ? monthsBetween(g.from && g.from <= dl ? g.from : dl, dl) : [dl];
                for (const m of months) {
                    const inc = m <= cm ? monthStats(m).inc : 0;
                    const fr = F && m >= cm ? F.rows[monthsDiff(cm, m)] : null;
                    actual += inc;
                    projected += m < cm ? inc : Math.max(inc, fr ? fr.total : 0);
                }
            } else {
                actual = balanceAt(null);
                projected = F ? projectBalance(F).end : balanceAt(monthEnd(dl));
            }
            const st = actual >= g.target ? 'tdone' : passed ? 'tlate' : projected >= g.target ? 'tok' : 'tbehind';
            return {
                isTarget: true, txs: [], saved: actual, projected, st,
                remain: Math.max(0, g.target - actual),
                pct: Math.max(0, Math.min(100, (actual / g.target) * 100)),
                monthsLeft: passed ? 0 : monthsDiff(cm, dl) + 1, need: 0
            };
        }
        const txs = D.gtx.filter((x) => x.goalId === g.id);
        const saved = Math.max(0, txs.reduce((a, x) => a + x.amount, 0));
        const remain = Math.max(0, g.target - saved), pct = Math.min(100, (saved / g.target) * 100);
        const win = Math.min(3, Math.max(1, monthsDiff(g.created.slice(0, 7), cm) + 1)), from = addMonths(cm, 1 - win);
        const avg = Math.max(0, r1000(txs.filter((x) => x.date.slice(0, 7) >= from).reduce((a, x) => a + x.amount, 0) / win));
        let monthsLeft = null, need = 0, st;
        if (g.deadline) {
            monthsLeft = Math.max(0, monthsDiff(cm, g.deadline) + 1);
            need = remain ? Math.ceil(remain / Math.max(1, monthsLeft) / 1000) * 1000 : 0;
            st = remain === 0 ? 'done' : monthsLeft === 0 ? 'late' : !txs.length ? 'new' : avg >= need * 0.95 ? 'ok' : 'behind';
        } else st = remain === 0 ? 'done' : 'free';
        const eta = remain && avg ? addMonths(cm, Math.max(0, Math.ceil(remain / avg) - 1)) : null;
        return { txs, saved, remain, pct, avg, monthsLeft, need, st, eta };
    }
    const GST = {
        done: ['green', 'Đã đủ tiền'], ok: ['green', 'Đúng tiến độ'], behind: ['orange', 'Chậm hơn kế hoạch'],
        late: ['red', 'Đã qua hạn'], new: ['blue', 'Mới bắt đầu'], tdone: ['green', 'Đã đạt'], tok: ['green', 'Dự kiến đạt'],
        tbehind: ['orange', 'Dự kiến chưa đạt'], tlate: ['red', 'Không đạt'], free: ['blue', 'Không đặt hạn']
    };
    const goalPill = (st) => `<span class="status ${GST[st][0]}">${GST[st][1]}</span>`;
    const goalsBehind = () => D.goals.filter((g) => !g.done && ['behind', 'late', 'tbehind'].includes(goalInfo(g).st));

    // ---------- Thành phần dùng chung ----------
    function deltaPill(cur, prev, upGood) {
        if (!prev) return '';
        const pct = ((cur - prev) / Math.abs(prev)) * 100;
        if (Math.abs(pct) < 0.05) return '<span class="delta">0%</span>';
        const up = pct > 0, good = up === upGood;
        return `<span class="delta ${good ? 'good' : 'bad'}">${up ? '↑' : '↓'} ${one(Math.abs(pct))}%</span>`;
    }
    const kpi = (label, icon, color, value, foot) => `
        <div class="kpi"><div class="kpi-top"><span>${label}</span><span class="stat-icon ${color}">${ic(icon)}</span></div>
            <div class="kpi-val">${value}</div><p class="kpi-foot">${foot}</p></div>`;
    const card = (title, sub, body, right = '', cls = '') => `
        <section class="card ${cls}"><div class="card-head"><div class="card-title"><span>${title}</span>${sub ? `<small>${sub}</small>` : ''}</div>
            <span class="spacer"></span>${right}</div><div class="card-body">${body}</div></section>`;
    const emptyBox = (title, text, btn = '') => `<div class="empty"><b>${title}</b>${text}${btn ? `<div class="empty-btn">${btn}</div>` : ''}</div>`;

    function txRow(t, showDate) {
        const c = cat(t.cat), s = t.sourceId && srcById(t.sourceId);
        return `<button class="tx" data-fa="tx-edit" data-id="${t.id}">${catIc(c)}
            <span class="tx-main"><span class="t1">${esc(t.note || c.name)}</span>
                <span class="t2">${esc(c.name)}${showDate ? ' · ' + fmtDM(t.date) : ''}${s ? ` <span class="chip">${ic('briefcase')}${esc(s.name)}</span>` : ''}</span></span>
            <span class="tx-amt ${t.type}">${t.type === 'in' ? '+' : '−'}${fmtNum(t.amount)} ₫</span></button>`;
    }
    const txSort = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id);

    function ringSvg(pct, color, size = 76) {
        const r = size / 2 - 7, C = 2 * Math.PI * r;
        return `<svg class="goal-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--hover)" stroke-width="7"/>
            <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
                stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
            <text x="50%" y="50%" dy=".35em" text-anchor="middle">${Math.round(pct)}%</text></svg>`;
    }

    // ---------- Biểu đồ (vẽ sau khi chèn HTML để biết chiều rộng) ----------
    function niceScale(max, n) {
        const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
        const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
        return { step, top: Math.ceil(max / step) * step };
    }
    /** Cột bo góc. cls: 'in'/'out' + 'cur'/'past' để giao diện tối tô sọc / gradient và vẽ nắp. */
    function barPath(x, y, w, h, fill, title, cls = '') {
        if (h < 0.5) return '';
        const r = Math.min(cls ? 6 : 4, w / 2, h);
        const cap = cls && h > 10 ? `<rect class="cap ${cls}" x="${x + 2.5}" y="${y + 3}" width="${Math.max(0, w - 5)}" height="3" rx="1.5"/>` : '';
        return `<path class="bar ${cls}" d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z" fill="${fill}">${title ? `<title>${title}</title>` : ''}</path>${cap}`;
    }
    function grid(W, ml, mr, y, step, top) {
        let g = '';
        for (let i = 0; i * step <= top + 1e-6; i++) {
            const v = i * step, yy = Math.round(y(v)) + 0.5;
            g += `<line x1="${ml}" x2="${W - mr}" y1="${yy}" y2="${yy}" class="${v ? 'grid' : 'base'}"/>`
                + `<text x="${ml - 8}" y="${yy}" class="tick" text-anchor="end" dominant-baseline="middle">${v ? fmtCompact(v) : '0'}</text>`;
        }
        return g;
    }
    function drawFlow() {
        const el = document.getElementById('chFlow');
        if (!el) return;
        const data = [];
        for (let i = 5; i >= 0; i--) { const k = addMonths(ui.month, -i); data.push({ k, ...monthStats(k) }); }
        const W = Math.max(260, el.clientWidth), H = 220, ml = 46, mr = 6, mt = 10, mb = 26, pw = W - ml - mr, ph = H - mt - mb;
        const { step, top } = niceScale(Math.max(1e6, ...data.map((d) => Math.max(d.inc, d.out))), 4);
        const y = (v) => mt + ph - (v / top) * ph, band = pw / 6, bw = Math.max(6, Math.min(22, (band * 0.6 - 3) / 2));
        let bars = '', labels = '';
        data.forEach((d, i) => {
            const bx = ml + band * i + (band - bw * 2 - 3) / 2, b = y(0);
            const when = i === 5 ? 'cur' : 'past';
            bars += barPath(bx, y(d.inc), bw, b - y(d.inc), 'var(--green)', `${monthLabel(d.k)} · Thu ${fmt(d.inc)}`, 'in ' + when)
                + barPath(bx + bw + 3, y(d.out), bw, b - y(d.out), 'var(--orange)', `${monthLabel(d.k)} · Chi ${fmt(d.out)}`, 'out ' + when);
            labels += `<text x="${ml + band * i + band / 2}" y="${H - 6}" text-anchor="middle" class="xl ${i === 5 ? 'cur' : ''}">${monthTick(d.k)}</text>`;
        });
        el.innerHTML = `<svg width="${W}" height="${H}">${grid(W, ml, mr, y, step, top)}${bars}${labels}</svg>`;
    }
    function drawForecast() {
        const el = document.getElementById('chFc');
        if (!el) return;
        const F = forecast(ui.fcN), R = F.rows;
        const used = D.sources.filter((s) => R.some((r) => r.srcBy[s.id]));
        const W = Math.max(280, el.clientWidth), H = 250, ml = 46, mr = 8, mt = 22, mb = 26, pw = W - ml - mr, ph = H - mt - mb;
        const showExp = ui.fcExp && F.expAvg;
        const { step, top } = niceScale(Math.max(1e6, ...R.map((r) => r.total), showExp ? F.expAvg : 0), 4);
        const y = (v) => mt + ph - (v / top) * ph, band = pw / R.length, bw = Math.max(4, Math.min(26, band * 0.55));
        const lstep = Math.ceil(R.length / 12);
        let bars = '', labels = '';
        R.forEach((r, i) => {
            const bx = ml + band * i + (band - bw) / 2;
            const segs = used.map((s, j) => [r.srcBy[s.id] || 0, `var(--c${j % 8})`, s.name])
                .concat([[r.avgIn, 'var(--bar-idle)', 'Thu khác (trung bình)'], [r.scen, 'url(#fcHatch)', 'Thử tính']])
                .filter((s) => s[0] > 0);
            let cum = 0;
            segs.forEach(([v, fill, name], j) => {
                const y0 = y(cum), y1 = y(cum + v), isTop = j === segs.length - 1;
                const tt = `${monthLabel(r.m)} · ${name}: ${fmt(v)}`;
                bars += isTop ? barPath(bx, y1, bw, y0 - y1, fill, tt)
                    : `<rect class="bar" x="${bx}" y="${y1 + 1}" width="${bw}" height="${Math.max(0, y0 - y1 - 1)}" fill="${fill}"><title>${tt}</title></rect>`;
                cum += v;
            });
            if (R.length <= 6 && r.total) bars += `<text x="${bx + bw / 2}" y="${y(r.total) - 7}" text-anchor="middle" class="vlab">${fmtCompact(r.total)}</text>`;
            if (i % lstep === 0) labels += `<text x="${bx + bw / 2}" y="${H - 6}" text-anchor="middle" class="xl ${i === 0 ? 'cur' : ''}">${monthTick(r.m)}</text>`;
        });
        const expLine = showExp ? `<line x1="${ml}" x2="${W - mr}" y1="${y(F.expAvg)}" y2="${y(F.expAvg)}" stroke="var(--red)" stroke-width="1.5" stroke-dasharray="5 4"><title>Chi trung bình ${fmt(F.expAvg)}/tháng</title></line>` : '';
        el.innerHTML = `<svg width="${W}" height="${H}"><defs><pattern id="fcHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--accent-soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" stroke-width="2.5"/></pattern></defs>
            ${grid(W, ml, mr, y, step, top)}${bars}${expLine}${labels}</svg>`;
    }
    function afterRender() { drawFlow(); drawForecast(); }

    // ---------- Header ----------
    function header() {
        if (!ui.month) ui.month = curMonth();
        const v = view;
        const monthChip = `<div class="month-chip">
            <button class="icon-btn" data-fa="month" data-d="-1" title="Tháng trước"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
            <span>${ICON.cal}${monthLabel(ui.month)}</span>
            <button class="icon-btn" data-fa="month" data-d="1" title="Tháng sau" ${ui.month >= curMonth() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
        const settings = `<button class="ghost-btn" data-fa="settings">${ic('gear')}Số dư & ngân sách</button>`;
        let actions = '', sub = '';
        if (v === 'f:overview' || v === 'f:tx' || v === 'f:sources') actions = monthChip + (v === 'f:overview' ? settings : '');
        if (v === 'f:forecast') {
            actions = `<div class="seg">${[3, 6, 12].map((n) => `<button class="${ui.fcN === n ? 'on' : ''}" data-fa="fc-n" data-n="${n}">${n} tháng</button>`).join('')}</div>`;
        }
        const ms = monthStats(ui.month);
        if (v === 'f:overview') sub = `Số dư ${fmt(balanceAt(null))} · thu ${fmtCompact(ms.inc)}, chi ${fmtCompact(ms.out)} trong ${monthLabel(ui.month).toLowerCase()}`;
        else if (v === 'f:tx') sub = `${D.tx.filter((t) => t.date.slice(0, 7) === ui.month).length} giao dịch trong ${monthLabel(ui.month).toLowerCase()}`;
        else if (v === 'f:sources') sub = `${D.sources.length} nguồn · ${lateSources(curMonth()).length} nguồn chưa nhận dù đã qua ngày`;
        else if (v === 'f:forecast') sub = `Dự kiến ${ui.fcN} tháng tới, theo nguồn thu đã khai báo và chi tiêu trung bình`;
        else if (v === 'f:goals') sub = `${D.goals.filter((g) => !g.done).length} mục tiêu đang theo · ${goalsBehind().length} đang chậm`;
        const add = { 'f:sources': 'Thêm nguồn thu', 'f:goals': 'Thêm mục tiêu' }[v] || 'Thêm giao dịch';
        return { title: VIEWS[v], sub, actions, add };
    }

    // ---------- Trang: Tổng quan ----------
    function overviewMain() {
        const k = ui.month, pk = addMonths(k, -1), isCur = k === curMonth();
        const upto = isCur ? new Date().getDate() : 0;
        const m = monthStats(k), p = monthStats(pk, upto || undefined);
        const cmp = isCur ? `so với cùng kỳ ${monthShort(pk)}` : `so với ${monthShort(pk)}`;
        const bal = isCur ? balanceAt(null) : balanceAt(monthEnd(k)), balPrev = balanceAt(monthEnd(pk));
        const net = m.inc - m.out, rate = m.inc ? Math.round((net / m.inc) * 100) : 0;
        const kpis = `<section class="card kpis">
            ${kpi(isCur ? 'Số dư hiện tại' : `Số dư cuối ${monthShort(k)}`, 'wallet', 'blue', fmtBig(bal), `${deltaPill(bal, balPrev, true)} so với cuối ${monthShort(pk)}`)}
            ${kpi('Thu trong tháng', 'arrowIn', 'green', fmtBig(m.inc), `${deltaPill(m.inc, p.inc, true)} ${cmp}`)}
            ${kpi('Chi trong tháng', 'arrowOut', 'orange', fmtBig(m.out), `${deltaPill(m.out, p.out, false)} ${cmp}`)}
            ${kpi('Để dành được', 'coins', 'purple', fmtBig(net), m.inc ? `<span class="delta ${rate >= 0 ? 'good' : 'bad'}">${rate}%</span> thu nhập tháng` : 'Chưa có khoản thu')}
        </section>`;
        const flow = card('Thu và chi 6 tháng', 'Tiền vào ra của bạn',
            '<div class="chart" id="chFlow"></div>',
            '<div class="legend"><span><i style="background:var(--green)"></i>Thu</span><span><i style="background:var(--orange)"></i>Chi</span></div>');
        const recent = D.tx.filter((x) => x.date.slice(0, 7) === k).sort(txSort).slice(0, 6);
        const recentCard = card('Giao dịch gần đây', monthLabel(k),
            recent.length ? `<div class="tx-list">${recent.map((x) => txRow(x, true)).join('')}</div>`
                : emptyBox('Chưa có giao dịch', `Ghi khoản thu chi đầu tiên của ${monthLabel(k).toLowerCase()}.`,
                    `<button class="primary-btn" data-fa="tx-add">${ICON.plus}Thêm giao dịch</button>`),
            `<button class="link-btn" data-view="f:tx">Tất cả ${ICON.arrow}</button>`);
        return kpis + flow + spendCard(m) + recentCard;
    }

    // ---------- Cơ cấu chi tiêu (biểu đồ tròn) ----------
    const catColor = (c) => `hsl(${c.hue} 72% 58%)`;
    function donutSvg(segs, total, center, sub, size = 190) {
        const sw = 22, r = (size - sw) / 2 - 4, C = 2 * Math.PI * r, gap = segs.length > 1 ? 6 : 0;
        let off = 0, arcs = '';
        for (const s of segs) {
            const len = (s.v / total) * C;
            const dash = Math.max(0.01, len - gap);
            arcs += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-linecap="round"
                stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off - gap / 2).toFixed(2)}"
                transform="rotate(-90 ${size / 2} ${size / 2})" class="seg-arc"><title>${s.title}</title></circle>`;
            off += len;
        }
        return `<svg class="donut" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--hover)" stroke-width="${sw}"/>${arcs}
            <text x="50%" y="47%" text-anchor="middle" class="d-val">${center}</text>
            <text x="50%" y="60%" text-anchor="middle" class="d-sub">${sub}</text></svg>`;
    }
    function spendCard(m) {
        const rows = Object.entries(m.by).sort((a, b) => b[1] - a[1]);
        if (!m.out) return '';
        const top = rows.slice(0, 5), rest = rows.slice(5).reduce((a, r) => a + r[1], 0);
        const segs = top.map(([id, v]) => ({ id, v, color: catColor(cat(id)), name: cat(id).name }));
        if (rest) segs.push({ id: 'rest', v: rest, color: 'var(--bar-idle)', name: 'Khác' });
        segs.forEach((s) => { s.title = `${s.name}: ${fmt(s.v)} (${Math.round((s.v / m.out) * 100)}%)`; });
        const legend = segs.map((s) => `<div class="dl-row"><i style="background:${s.color}"></i><span class="ellipsis">${esc(s.name)}</span>
            <b>${fmtCompact(s.v)}</b><small>${Math.round((s.v / m.out) * 100)}%</small></div>`).join('');
        const big = segs.slice(0, 2).map((s) => `<b>${esc(s.name)}</b>`).join(' và ');
        const share = Math.round(((segs[0].v + (segs[1]?.v || 0)) / m.out) * 100);
        return card('Cơ cấu chi tiêu', monthLabel(ui.month), `<div class="spend">
            ${donutSvg(segs, m.out, fmtCompact(m.out), 'Tổng chi')}
            <div class="dl">${legend}</div></div>
            <p class="hint spend-note">${ICON.bolt}<span>${segs.length > 1 ? `${share}% chi tiêu đến từ ${big}.` : `Toàn bộ chi tiêu là ${big}.`}
            ${D.settings.budget ? ` Đã dùng ${Math.round((m.out / D.settings.budget) * 100)}% ngân sách tháng.` : ''}</span></p>`,
            `<button class="link-btn" data-view="f:tx">Chi tiết ${ICON.arrow}</button>`);
    }

    function budgetCard() {
        const k = ui.month, st = D.settings, m = monthStats(k), bud = st.catBudgets || {};
        let budget;
        if (st.budget) {
            const spent = m.out, pc = (spent / st.budget) * 100, left = st.budget - spent;
            const cls = pc > 100 ? 'crit' : pc >= 80 ? 'warn' : '';
            const pill = pc > 100 ? `<span class="badge red">Vượt ${fmtCompact(-left)}</span>`
                : pc >= 80 ? `<span class="badge orange">Đã dùng ${Math.round(pc)}%</span>` : '<span class="badge green">Trong mức</span>';
            let perDay = '';
            if (k === curMonth()) {
                const dl = daysIn(k) - new Date().getDate() + 1;
                perDay = `<div><dt>Còn ${dl} ngày, mỗi ngày tiêu được</dt><dd>${left > 0 ? fmt(Math.floor(left / dl / 1000) * 1000) : '0 ₫'}</dd></div>`;
            }
            budget = `<div class="budget-top"><div><b>Ngân sách tháng</b><small>${fmt(spent)} / ${fmt(st.budget)}</small></div>${pill}</div>
                <div class="meter ${cls}"><i style="width:${Math.min(100, pc)}%"></i></div>
                <dl class="facts"><div><dt>${left >= 0 ? 'Còn lại' : 'Đã vượt'}</dt><dd>${fmt(Math.abs(left))}</dd></div>${perDay}</dl>`;
        } else {
            budget = `<div class="hint">${ic('target')}<span>Đặt ngân sách chi mỗi tháng để biết mỗi ngày còn tiêu được bao nhiêu.
                <button class="link" data-fa="settings">Đặt ngân sách</button></span></div>`;
        }
        const entries = Object.entries(m.by).sort((a, b) => b[1] - a[1]).slice(0, 7);
        const scale = Math.max(1, ...entries.map(([c, v]) => Math.max(v, bud[c] || 0)));
        const rows = entries.map(([cid, v]) => {
            const c = cat(cid), b = bud[cid] || 0, over = b && v > b;
            return `<div class="crow" title="${esc(c.name)}: ${fmt(v)}${b ? ' / ngân sách ' + fmt(b) : ''}">
                <div class="crow-l">${catIc(c, 'sm')}<span class="ellipsis">${esc(c.name)}</span></div>
                <div class="crow-v">${fmtNum(v)} ₫${b ? `<small class="${over ? 'over' : ''}">${over ? 'vượt ' + fmtCompact(v - b) : '/ ' + fmtCompact(b)}</small>` : ''}</div>
                <div class="track"><i class="${over ? 'over' : ''}" style="width:${(v / scale) * 100}%;--h:${c.hue}"></i>${b ? `<b style="left:${(b / scale) * 100}%"></b>` : ''}</div></div>`;
        }).join('') || '<p class="muted">Chưa có khoản chi nào.</p>';
        return `<section class="card"><div class="card-body top">${budget}</div>
            <div class="card-head"><div class="card-title"><span>Chi theo danh mục</span><small>${monthLabel(k)}</small></div></div>
            <div class="card-body pad crows">${rows}</div></section>`;
    }

    function suggestions() {
        const out = [], cm = curMonth();
        for (const l of lateSources(cm)) {
            out.push({
                html: `<b>${esc(l.s.name)}</b> chưa nhận dù đã qua ngày ${fmtDM(l.due)}, còn <b>${fmt(l.remain)}</b>.`,
                btn: `<button class="ghost-btn" data-fa="src-receive" data-id="${l.s.id}">${ICON.check}Ghi đã nhận</button>`
            });
        }
        const st = D.settings, m = monthStats(cm);
        if (st.budget && m.out > st.budget) out.push({ html: `Chi tiêu tháng này đã <b>vượt ngân sách ${fmt(m.out - st.budget)}</b>. Xem lại các khoản lớn nhất.`, btn: `<button class="ghost-btn" data-view="f:tx">Xem giao dịch</button>` });
        for (const [cid, b] of Object.entries(st.catBudgets || {})) {
            if ((m.by[cid] || 0) > b) out.push({ html: `Danh mục <b>${esc(cat(cid).name)}</b> vượt ngân sách ${fmt(m.by[cid] - b)}.` });
        }
        for (const g of goalsBehind()) {
            const f = goalInfo(g);
            out.push({
                html: f.isTarget ? `Mục tiêu <b>${esc(g.name)}</b> dự kiến chưa đạt, còn thiếu <b>${fmt(Math.max(0, g.target - f.projected))}</b>.`
                    : `Mục tiêu <b>${esc(g.name)}</b> đang chậm. Góp <b>${fmt(f.need)}</b> mỗi tháng để kịp hạn.`,
                btn: f.isTarget ? '' : `<button class="ghost-btn" data-fa="goal-add" data-id="${g.id}">${ICON.plus}Góp thêm</button>`
            });
        }
        if (!D.tx.some((t) => t.date === todayIso())) out.push({ html: 'Hôm nay chưa ghi khoản thu chi nào. Ghi ngay để sổ luôn khớp với ví.', btn: `<button class="ghost-btn" data-fa="tx-add">${ICON.plus}Thêm giao dịch</button>` });
        if (!D.sources.length) out.push({ html: 'Khai báo <b>nguồn thu nhập</b> (lương, gia đình gửi, học bổng…) để ước tính thu nhập các tháng tới.', btn: `<button class="ghost-btn" data-view="f:sources">Thêm nguồn thu</button>` });
        return out.slice(0, 3);
    }

    function overviewSide() {
        const sug = suggestions();
        const sugCard = `<section class="card"><div class="card-head"><span class="spark"></span><div class="card-title"><span>Việc nên làm</span></div></div>
            <div class="card-body pad sugg">${sug.map((s, i) => `<div class="sg"><span class="sg-n">${pad(i + 1)}</span><div><p>${s.html}</p>${s.btn || ''}</div></div>`).join('')
            || '<p class="muted">Mọi thứ đều ổn 🎉</p>'}</div></section>`;
        const act = D.goals.filter((g) => !g.done).slice(0, 4);
        const goals = card('Mục tiêu tài chính', '', act.length ? act.map((g) => {
            const f = goalInfo(g);
            return `<button class="ring-row" data-view="f:goals">${ring(f.pct, goalColor(g))}
                <span class="ring-info"><span class="ellipsis">${esc(g.name)}</span><b>${Math.round(f.pct)}%</b></span>${goalPill(f.st)}</button>`;
        }).join('') : emptyBox('Chưa có mục tiêu', 'Đặt một khoản muốn để dành hoặc mức thu nhập muốn đạt.',
            `<button class="ghost-btn" data-fa="goal-new">${ICON.plus}Thêm mục tiêu</button>`),
        `<button class="link-btn" data-view="f:goals">Xem ${ICON.arrow}</button>`, 'flush');
        return sugCard + budgetCard() + goals;
    }

    // ---------- Trang: Giao dịch ----------
    function txMain() {
        const opts = CATS.filter((c) => ui.txType === 'all' || c.type === ui.txType);
        if (ui.txCat !== 'all' && !opts.some((c) => c.id === ui.txCat)) ui.txCat = 'all';
        const q = ui.q.trim().toLowerCase();
        const list = D.tx.filter((t) => t.date.slice(0, 7) === ui.month && (ui.txType === 'all' || t.type === ui.txType)
            && (ui.txCat === 'all' || t.cat === ui.txCat)
            && (!q || ((t.note || '') + ' ' + cat(t.cat).name).toLowerCase().includes(q))).sort(txSort);
        let inc = 0, out = 0;
        for (const t of list) t.type === 'in' ? (inc += t.amount) : (out += t.amount);
        const filters = `<div class="filters">
            <div class="seg">${[['all', 'Tất cả'], ['out', 'Khoản chi'], ['in', 'Khoản thu']].map(([v, l]) =>
                `<button class="${ui.txType === v ? 'on' : ''}" data-fa="tx-type" data-v="${v}">${l}</button>`).join('')}</div>
            <select data-ff="cat"><option value="all">Mọi danh mục</option>${opts.map((c) => `<option value="${c.id}" ${ui.txCat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
            <label class="search">${ICON_SEARCH}<input data-ff="q" placeholder="Tìm ghi chú, danh mục…" value="${esc(ui.q)}"></label></div>
            <dl class="sum-strip"><div><dt>Tổng thu</dt><dd class="in">+${fmt(inc)}</dd></div><div><dt>Tổng chi</dt><dd class="out">−${fmt(out)}</dd></div>
                <div><dt>Chênh lệch</dt><dd>${inc - out >= 0 ? '+' : ''}${fmt(inc - out)}</dd></div></dl>`;
        let body;
        if (!list.length) {
            const f = ui.txType !== 'all' || ui.txCat !== 'all' || q;
            body = emptyBox(f ? 'Không có giao dịch khớp bộ lọc' : 'Chưa có giao dịch', f ? 'Thử bỏ bớt bộ lọc.' : `Chưa có giao dịch nào trong ${monthLabel(ui.month).toLowerCase()}.`,
                f ? '' : `<button class="primary-btn" data-fa="tx-add">${ICON.plus}Thêm giao dịch</button>`);
        } else {
            const groups = new Map();
            for (const t of list) { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); }
            body = '<div class="tx-list">';
            for (const [d, items] of groups) {
                const n = items.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0);
                body += `<div class="day-h"><span>${fmtDay(d)}${d === todayIso() ? ' · hôm nay' : ''}</span><span>${n >= 0 ? '+' : '−'}${fmtNum(Math.abs(n))} ₫</span></div>`
                    + items.map((t) => txRow(t, false)).join('');
            }
            body += '</div>';
        }
        return `<section class="card flush"><div class="card-body top">${filters}</div>${body}</section>`;
    }
    const ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>';

    function txSide() {
        const m = monthStats(ui.month);
        const entries = Object.entries(m.byIn).sort((a, b) => b[1] - a[1]);
        const inc = card('Thu theo danh mục', monthLabel(ui.month), entries.length
            ? `<div class="crows">${entries.map(([cid, v]) => { const c = cat(cid); return `<div class="crow"><div class="crow-l">${catIc(c, 'sm')}<span class="ellipsis">${esc(c.name)}</span></div><div class="crow-v">${fmtNum(v)} ₫</div><div class="track"><i style="width:${(v / m.inc) * 100}%;--h:${c.hue}"></i></div></div>`; }).join('')}</div>`
            : '<p class="muted">Chưa có khoản thu nào.</p>', '', 'padded');
        return budgetCard() + inc;
    }

    // ---------- Trang: Nguồn thu nhập ----------
    const SRC_TPL = [['Lương làm thêm', 'lamthem', 'month', 2000000], ['Gia đình gửi', 'giadinh', 'month', 3000000],
        ['Học bổng', 'hocbong', 'once', 5000000], ['Việc tự do', 'lamthem', 'irregular', 500000]];
    function sourcesMain() {
        const k = ui.month, lines = D.sources.map((s) => srcLine(s, k)).filter(Boolean);
        const exp = lines.reduce((a, l) => a + l.exp, 0), rec = lines.reduce((a, l) => a + l.rec, 0);
        const pend = lines.reduce((a, l) => a + l.remain, 0), late = lines.filter((l) => l.st === 'tre');
        const ms = monthStats(k);
        const kpis = `<section class="card kpis">
            ${kpi(`Dự kiến ${monthShort(k)}`, 'briefcase', 'blue', fmtBig(exp), `${lines.length} nguồn trong tháng`)}
            ${kpi('Đã nhận', 'arrowIn', 'green', fmtBig(rec), exp ? `${Math.round((rec / exp) * 100)}% số dự kiến` : 'Chưa có nguồn nào')}
            ${kpi('Còn chờ nhận', 'coins', late.length ? 'red' : 'orange', fmtBig(pend), late.length ? `<span class="delta bad">${late.length} nguồn đã qua ngày</span>` : 'Không có khoản trễ')}
            ${kpi('Tổng thu trong tháng', 'wallet', 'purple', fmtBig(ms.inc), 'gồm cả khoản không gắn nguồn')}
        </section>`;
        const rows = D.sources.map((s) => {
            const l = srcLine(s, k), c = cat(s.cat);
            return `<div class="src-row ${l ? '' : 'inactive'}">${catIc(c)}
                <div class="src-main"><b>${esc(s.name)}</b><small>${esc(srcWhen(s))}${s.note ? ' · ' + esc(s.note) : ''}</small></div>
                <div class="src-num"><small>Dự kiến</small><b>${fmtCompact(s.amount)}</b></div>
                <div class="src-num"><small>Đã nhận</small><b>${l ? fmtCompact(l.rec) : '–'}</b></div>
                ${l ? srcPill(l.st) : '<span class="status">Không có trong tháng</span>'}
                <div class="src-act">${l && l.st !== 'du' ? `<button class="ghost-btn" data-fa="src-receive" data-id="${s.id}">${ICON.check}Ghi nhận</button>` : ''}
                    <button class="icon-btn" data-fa="src-edit" data-id="${s.id}" title="Sửa"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></div></div>`;
        }).join('');
        const list = card('Các nguồn thu', `Trạng thái ${monthLabel(k).toLowerCase()}`, D.sources.length ? rows
            : emptyBox('Chưa có nguồn thu nào', 'Thêm lương, tiền gia đình gửi, học bổng… để theo dõi đã nhận hay chưa và ước tính thu nhập.',
                SRC_TPL.map(([n], i) => `<button class="ghost-btn" data-fa="src-add" data-tpl="${i}">${ICON.plus}${n}</button>`).join('')),
        `<button class="primary-btn" data-fa="src-add">${ICON.plus}Thêm nguồn</button>`, 'flush');
        return kpis + list;
    }
    function sourcesSide() {
        const k = ui.month, ms = monthStats(k);
        const parts = [];
        let ci = 0;
        for (const s of D.sources) { const v = srcReceived(s, k); if (v) parts.push({ name: s.name, v, col: `var(--c${ci++ % 8})` }); }
        const rest = ms.inc - parts.reduce((a, p) => a + p.v, 0);
        if (rest > 0) parts.push({ name: 'Thu khác, chưa gắn nguồn', v: rest, col: 'var(--bar-idle)' });
        const sum = parts.reduce((a, p) => a + p.v, 0) || 1;
        const mix = card(`Cơ cấu thu nhập`, monthLabel(k), ms.inc ? `<div class="segbar">${parts.map((p) => `<span style="flex:${p.v} 0 0;background:${p.col}" title="${esc(p.name)}: ${fmt(p.v)}"></span>`).join('')}</div>
            <div class="mix-list">${parts.map((p) => `<div><i style="background:${p.col}"></i><span class="ellipsis">${esc(p.name)}</span><b>${fmtCompact(p.v)}</b><small>${Math.round((p.v / sum) * 100)}%</small></div>`).join('')}</div>`
            : '<p class="muted">Chưa có khoản thu nào trong tháng.</p>', `<b>${fmt(ms.inc)}</b>`, 'padded');
        const tpl = card('Thêm nhanh', 'Mẫu nguồn thu hay gặp', `<div class="btn-wrap">${SRC_TPL.map(([n], i) => `<button class="ghost-btn" data-fa="src-add" data-tpl="${i}">${ICON.plus}${n}</button>`).join('')}</div>
            <p class="hint-s">Khi nhận tiền, bấm <b>Ghi nhận</b> để tạo giao dịch thu gắn với nguồn. Nguồn chưa nhận dù đã qua ngày sẽ được nhắc ở Tổng quan.</p>`, '', 'padded');
        return mix + tpl;
    }

    // ---------- Trang: Ước tính thu nhập ----------
    function forecastMain() {
        const N = ui.fcN, F = forecast(N), R = F.rows, cm = curMonth();
        const cur = R[0], next = R[1] || forecast(2).rows[1];
        const sumTotal = R.reduce((a, r) => a + r.total, 0), sumNet = R.reduce((a, r) => a + r.net, 0);
        const kpis = `<section class="card kpis">
            ${kpi(`Thu nhập dự kiến ${monthShort(cm)}`, 'wallet', 'blue', fmtBig(cur.total), `đã nhận ${fmtCompact(monthStats(cm).inc)}`)}
            ${kpi(`Dự kiến ${monthTick(next.m)}`, 'trendUp', 'purple', fmtBig(next.total), `${deltaPill(next.total, cur.total, true)} so với ${monthShort(cm)}`)}
            ${kpi(`Tổng thu ${N} tháng`, 'coins', 'green', fmtBig(sumTotal), `${monthTick(F.months[0])} đến ${monthTick(F.months[N - 1])}`)}
            ${kpi(ui.fcExp ? 'Còn lại sau chi tiêu' : 'Chi trung bình', 'arrowOut', ui.fcExp && sumNet < 0 ? 'red' : 'orange', fmtBig(ui.fcExp ? sumNet : F.expAvg), ui.fcExp ? `chi trung bình ${fmtCompact(F.expAvg)}/tháng` : `${F.pastN} tháng gần nhất`)}
        </section>`;
        const used = D.sources.filter((s) => R.some((r) => r.srcBy[s.id]));
        const legend = used.map((s, j) => `<span><i style="background:var(--c${j % 8})"></i>${esc(s.name)}</span>`).join('')
            + (ui.fcOther && F.otherAvg ? '<span><i style="background:var(--bar-idle)"></i>Thu khác (trung bình)</span>' : '')
            + (ui.scen.length ? '<span><i class="hatch"></i>Thử tính</span>' : '')
            + (ui.fcExp && F.expAvg ? `<span><i class="dash"></i>Chi trung bình ${fmtCompact(F.expAvg)}</span>` : '');
        const toggles = `<label class="check"><input type="checkbox" data-ff="fco" ${ui.fcOther ? 'checked' : ''}>Thu khác trung bình</label>
            <label class="check"><input type="checkbox" data-ff="fce" ${ui.fcExp ? 'checked' : ''}>Trừ chi tiêu</label>`;
        const chart = card('Thu nhập dự kiến theo tháng', 'Theo nguồn thu đã khai báo', `<div class="legend wrap">${legend}</div><div class="chart" id="chFc"></div>`, toggles, 'padded');
        const hasExp = ui.fcExp && F.expAvg, hasScen = ui.scen.length > 0, hasOther = ui.fcOther && F.otherAvg;
        const sum = (k) => R.reduce((a, r) => a + r[k], 0);
        const table = card('Chi tiết từng tháng', `${monthLabel(F.months[0])} đến ${monthLabel(F.months[N - 1]).toLowerCase()}`, `<div class="table-wrap"><table class="tbl">
            <thead><tr><th>Tháng</th><th class="num">Nguồn thu</th>${hasOther ? '<th class="num">Thu khác TB</th>' : ''}${hasScen ? '<th class="num">Thử tính</th>' : ''}<th class="num">Tổng thu</th>${hasExp ? '<th class="num">Chi dự kiến</th><th class="num">Còn lại</th>' : ''}</tr></thead>
            <tbody>${R.map((r, i) => `<tr><td>${monthSlash(r.m)}${i === 0 ? ' <span class="chip">nay</span>' : ''}</td><td class="num">${fmt(r.srcExp)}</td>${hasOther ? `<td class="num">${fmt(r.avgIn)}</td>` : ''}${hasScen ? `<td class="num">${r.scen ? '+' + fmt(r.scen) : '–'}</td>` : ''}<td class="num"><b>${fmt(r.total)}</b></td>${hasExp ? `<td class="num">−${fmt(r.exp)}</td><td class="num"><b class="${r.net >= 0 ? 'pos' : 'neg'}">${r.net >= 0 ? '+' : ''}${fmt(r.net)}</b></td>` : ''}</tr>`).join('')}</tbody>
            <tfoot><tr><td><b>Cộng ${N} tháng</b></td><td class="num"><b>${fmt(sum('srcExp'))}</b></td>${hasOther ? `<td class="num"><b>${fmt(sum('avgIn'))}</b></td>` : ''}${hasScen ? `<td class="num"><b>+${fmt(sum('scen'))}</b></td>` : ''}<td class="num"><b>${fmt(sumTotal)}</b></td>${hasExp ? `<td class="num"><b>−${fmt(sum('exp'))}</b></td><td class="num"><b>${sumNet >= 0 ? '+' : ''}${fmt(sumNet)}</b></td>` : ''}</tr></tfoot></table></div>
            <p class="hint-s">${F.pastN ? `Chi tiêu và thu khác chưa gắn nguồn lấy trung bình ${F.pastN} tháng gần nhất.` : 'Chưa có giao dịch các tháng trước nên chưa ước tính được chi tiêu.'} Nguồn thu tính theo số dự kiến bạn khai báo.</p>`, '', 'padded');
        return kpis + chart + table;
    }
    function forecastSide() {
        const N = ui.fcN, F = forecast(N);
        const P = projectBalance(F);
        const perMonth = F.rows.length > 1 ? r1000(P.futureNet / (F.rows.length - 1)) : F.rows[0].net;
        const bal = card('Số dư dự kiến', `Cuối ${monthLabel(F.months[N - 1]).toLowerCase()}`, `
            <p class="big">${fmtBig(P.end)}</p>
            <dl class="facts"><div><dt>Số dư hiện tại</dt><dd>${fmt(P.now)}</dd></div>
                <div><dt>Còn sẽ vào/ra trong ${monthShort(curMonth())}</dt><dd>${P.curRest >= 0 ? '+' : ''}${fmt(P.curRest)}</dd></div>
                <div><dt>Các tháng sau, sau khi trừ chi</dt><dd>${P.futureNet >= 0 ? '+' : ''}${fmt(P.futureNet)}</dd></div></dl>`,
        `<span class="badge ${perMonth >= 0 ? 'green' : 'red'}">${perMonth >= 0 ? '+' : '−'}${fmtCompact(Math.abs(perMonth))}/tháng</span>`, 'padded');
        const cm = curMonth(), nm = addMonths(cm, 1);
        const t = ui.scType;
        const fields = t === 'src'
            ? `<label class="field"><span>Tên nguồn</span><input name="name" maxlength="50" placeholder="VD: Part-time cuối tuần"></label>
               <div class="row2"><label class="field"><span>Mỗi tháng</span><input name="amount" class="money" inputmode="numeric" value="2.000.000"></label>
               <label class="field"><span>Từ tháng</span><input name="from" type="month" value="${nm}"></label></div>
               <label class="field"><span>Đến tháng (không bắt buộc)</span><input name="to" type="month"></label>`
            : `<div class="row2"><label class="field"><span>Bớt chi mỗi tháng</span><input name="amount" class="money" inputmode="numeric" value="500.000"></label>
               <label class="field"><span>Từ tháng</span><input name="from" type="month" value="${nm}"></label></div>`;
        const list = ui.scen.map((sc, i) => `<div class="scen"><span class="cat-ic sm" style="--h:${sc.type === 'src' ? 150 : 28}">${ic(sc.type === 'src' ? 'briefcase' : 'arrowOut')}</span>
            <span class="ellipsis">${sc.type === 'src' ? esc(sc.name || 'Nguồn mới') : 'Bớt chi'} · từ ${monthSlash(sc.from)}${sc.to ? ' đến ' + monthSlash(sc.to) : ''}<br><b class="pos">${sc.type === 'src' ? '+' : '−'}${fmt(sc.amount)}/tháng</b></span>
            <button type="button" class="icon-btn" data-fa="scen-del" data-i="${i}" title="Bỏ">✕</button></div>`).join('');
        const whatIf = `<section class="card padded"><div class="card-head"><div class="card-title"><span>Thử tính</span><small>Xem thu nhập đổi ra sao, không đổi dữ liệu thật</small></div></div>
            <form class="card-body scen-form" id="scenForm">
                <div class="seg">${[['src', 'Nguồn thu mới'], ['cut', 'Cắt giảm chi']].map(([v, l]) => `<button type="button" class="${t === v ? 'on' : ''}" data-fa="sc-type" data-v="${v}">${l}</button>`).join('')}</div>
                ${fields}
                <div class="btn-wrap"><button class="primary-btn">${ICON.plus}Thêm vào dự báo</button>${ui.scen.length ? '<button type="button" class="ghost-btn" data-fa="scen-clear">Bỏ hết</button>' : ''}</div>
                ${list ? `<div class="scen-list">${list}</div>` : ''}</form></section>`;
        return bal + whatIf;
    }

    // ---------- Trang: Mục tiêu ----------
    const GOAL_TPL = [['Quỹ dự phòng', 'save', 10000000, 'shield'], ['Mua laptop', 'save', 15000000, 'laptop'],
        ['Thu nhập 10 triệu/tháng', 'income', 10000000, 'trendUp'], ['Số dư 50 triệu', 'balance', 50000000, 'wallet']];
    function goalsMain() {
        const act = D.goals.filter((g) => !g.done), done = D.goals.filter((g) => g.done);
        const infos = new Map(D.goals.map((g) => [g.id, goalInfo(g)]));
        const sv = act.filter((g) => !infos.get(g.id).isTarget);
        const target = sv.reduce((a, g) => a + g.target, 0), saved = sv.reduce((a, g) => a + infos.get(g.id).saved, 0);
        const need = sv.reduce((a, g) => a + infos.get(g.id).need, 0);
        const F = forecast(4, { noScen: true, other: true, exp: true });
        const canSave = r1000(F.rows.slice(1).reduce((a, r) => a + r.net, 0) / 3);
        const kpis = `<section class="card kpis">
            ${kpi('Đã để dành', 'target', 'blue', fmtBig(saved), target ? `${Math.round((saved / target) * 100)}% của ${fmtCompact(target)}` : 'Chưa có mục tiêu để dành')}
            ${kpi('Cần để dành mỗi tháng', 'swap', 'purple', fmtBig(need), need ? 'để kịp hạn các mục tiêu' : 'Không có mục tiêu có hạn')}
            ${kpi('Có thể để dành mỗi tháng', 'trendUp', canSave >= need ? 'green' : 'red', fmtBig(canSave), need ? (canSave >= need ? `<span class="delta good">Đủ, dư ${fmtCompact(canSave - need)}</span>` : `<span class="delta bad">Thiếu ${fmtCompact(need - canSave)}</span>`) : 'theo ước tính 3 tháng tới')}
            ${kpi('Số dư chưa phân bổ', 'wallet', 'orange', fmtBig(balanceAt(null) - saved), 'số dư trừ tiền đã để dành')}
        </section>`;
        const cardOf = (g) => {
            const f = infos.get(g.id), isInc = g.kind === 'income';
            let when, plan = '', dl;
            if (f.isTarget) {
                const scope = isInc ? (g.scope === 'range' ? `tổng thu từ ${monthSlash(g.from)} đến ${monthSlash(g.deadline)}` : `thu nhập ${monthLabel(g.deadline).toLowerCase()}`) : `số dư cuối ${monthLabel(g.deadline).toLowerCase()}`;
                when = `${isInc ? 'Mục tiêu thu nhập' : 'Mục tiêu số dư'} · ${scope}${!g.done && f.monthsLeft ? ` · còn ${f.monthsLeft} tháng` : ''}`;
                if (!g.done) {
                    plan = f.st === 'tdone' ? `Đã đạt, vượt ${fmt(f.saved - g.target)}.`
                        : f.st === 'tlate' ? `Đã hết hạn, còn thiếu ${fmt(Math.max(0, g.target - f.projected))}.`
                            : `Nếu thu chi như dự kiến, ${scope} khoảng <b>${fmt(f.projected)}</b>${f.projected >= g.target ? `, vượt ${fmt(f.projected - g.target)}.` : `, còn thiếu <b>${fmt(g.target - f.projected)}</b>.`}`;
                }
                dl = `<dt>${isInc ? 'Đã thu được' : 'Số dư hiện tại'}</dt><dd>${fmt(f.saved)}</dd><dt>Mục tiêu</dt><dd>${fmt(g.target)}</dd>`
                    + (!g.done && f.st !== 'tdone' ? `<dt>Dự kiến đạt</dt><dd class="${f.projected >= g.target ? 'pos' : 'neg'}">${fmt(f.projected)}</dd>` : '');
            } else {
                when = g.done ? `Hoàn thành ${fmtDM(g.done)}` : g.deadline ? `Hạn ${monthLabel(g.deadline).toLowerCase()} · ${f.monthsLeft ? `còn ${f.monthsLeft} tháng` : 'đã đến hạn'}` : 'Không đặt hạn';
                if (!g.done && f.remain) {
                    plan = g.deadline && f.monthsLeft ? `Góp <b>${fmt(f.need)}</b> mỗi tháng để kịp hạn.` : g.deadline ? `Đã qua hạn, còn thiếu <b>${fmt(f.remain)}</b>.` : '';
                    plan += f.avg ? ` Mức góp gần đây khoảng ${fmtCompact(f.avg)}/tháng, sẽ đủ vào <b>${monthLabel(f.eta).toLowerCase()}</b>${g.deadline && f.eta > g.deadline ? `, trễ ${monthsDiff(g.deadline, f.eta)} tháng` : ''}.` : ' Chưa có lần góp nào gần đây.';
                }
                dl = `<dt>Đã để dành</dt><dd>${fmt(f.saved)}</dd><dt>Mục tiêu</dt><dd>${fmt(g.target)}</dd>${!g.done ? `<dt>Còn thiếu</dt><dd>${fmt(f.remain)}</dd>` : ''}`;
            }
            const txs = f.txs.length ? `<div class="gtx">${f.txs.slice(0, 3).map((x) => `<div><span class="muted">${fmtDM(x.date)}${x.note ? ' · ' + esc(x.note) : ''}</span><b class="${x.amount < 0 ? 'neg' : ''}">${x.amount < 0 ? '−' : '+'}${fmt(Math.abs(x.amount))}</b><button class="icon-btn" data-fa="gtx-del" data-id="${x.id}" title="Xoá lần góp">✕</button></div>`).join('')}</div>` : '';
            const actions = g.done
                ? `<button class="ghost-btn" data-fa="goal-reopen" data-id="${g.id}">Mở lại</button>`
                : f.isTarget
                    ? `<button class="ghost-btn" data-view="f:forecast">${ic('trendUp')}Xem ước tính</button>${['tdone', 'tlate'].includes(f.st) ? `<button class="ghost-btn" data-fa="goal-done" data-id="${g.id}">${ICON.check}Đóng</button>` : ''}`
                    : `<button class="primary-btn" data-fa="goal-add" data-id="${g.id}">${ICON.plus}Góp thêm</button>${f.saved ? `<button class="ghost-btn" data-fa="goal-take" data-id="${g.id}">Rút ra</button>` : ''}${f.remain === 0 ? `<button class="ghost-btn" data-fa="goal-done" data-id="${g.id}">${ICON.check}Hoàn thành</button>` : ''}`;
            return `<article class="card goal" style="--gc:${goalColor(g)}">
                <div class="goal-top">${ringSvg(f.pct, goalColor(g))}<div class="goal-h">
                    <div class="goal-name"><span class="goal-ic">${ic(g.icon)}</span><b>${esc(g.name)}</b></div>
                    <small>${esc(when)}</small><div>${g.done ? '<span class="status">Đã xong</span>' : goalPill(f.st)}</div></div></div>
                <dl class="goal-dl">${dl}</dl>
                ${plan ? `<p class="hint">${ic('target')}<span>${plan}</span></p>` : ''}${txs}
                <div class="goal-foot">${actions}<span class="spacer"></span><button class="icon-btn" data-fa="goal-edit" data-id="${g.id}" title="Sửa"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></div></article>`;
        };
        const emptyG = `<section class="card">${emptyBox('Chưa có mục tiêu nào', 'Đặt một khoản muốn để dành, hoặc mức thu nhập, số dư muốn đạt vào một thời điểm.',
            GOAL_TPL.map(([n], i) => `<button class="ghost-btn" data-fa="goal-new" data-tpl="${i}">${ICON.plus}${n}</button>`).join(''))}</section>`;
        return kpis + (act.length ? `<div class="goal-grid">${act.map(cardOf).join('')}</div>` : emptyG)
            + (done.length ? `<div class="sec-label">Đã hoàn thành · ${done.length}</div><div class="goal-grid">${done.map(cardOf).join('')}</div>` : '');
    }
    function goalsSide() {
        return card('Ba kiểu mục tiêu', '', `<div class="kinds">
            <div><span class="cat-ic sm" style="--h:228">${ic('target')}</span><p><b>Để dành</b> — góp dần cho một khoản. Tiền vẫn nằm trong số dư, góp hay rút không tạo giao dịch.</p></div>
            <div><span class="cat-ic sm" style="--h:150">${ic('trendUp')}</span><p><b>Thu nhập đạt</b> — trong một tháng hoặc cộng dồn nhiều tháng, tự tính từ giao dịch và nguồn thu.</p></div>
            <div><span class="cat-ic sm" style="--h:45">${ic('wallet')}</span><p><b>Số dư đạt</b> — số dư vào cuối một tháng, dự kiến theo thu chi trung bình.</p></div></div>`, '', 'padded')
            + card('Thêm nhanh', '', `<div class="btn-wrap">${GOAL_TPL.map(([n], i) => `<button class="ghost-btn" data-fa="goal-new" data-tpl="${i}">${ICON.plus}${n}</button>`).join('')}</div>`, '', 'padded');
    }

    // ---------- Render ----------
    function main() {
        if (!ui.month) ui.month = curMonth();
        if (!loaded) return '<section class="card empty">Đang tải…</section>';
        return { 'f:overview': overviewMain, 'f:tx': txMain, 'f:sources': sourcesMain, 'f:forecast': forecastMain, 'f:goals': goalsMain }[view]();
    }
    function side() {
        if (!loaded) return '';
        return { 'f:overview': overviewSide, 'f:tx': txSide, 'f:sources': sourcesSide, 'f:forecast': forecastSide, 'f:goals': goalsSide }[view]();
    }
    function navBadges() {
        if (!loaded) return {};
        const late = lateSources(curMonth()).length, behind = goalsBehind().length;
        return { 'f:sources': late || '', 'f:goals': behind ? '!' : '' };
    }
    function rerender() {
        render();
    }

    // ---------- Hộp thoại ----------
    const dlg = () => document.getElementById('finDialog');
    function openDialog(title, body, onOk, opts = {}) {
        const form = document.getElementById('finForm');
        form.innerHTML = `<h3>${title}</h3>${opts.hint ? `<p class="hint-s">${opts.hint}</p>` : ''}<div class="dlg-body">${body}</div>
            <p class="error"></p><div class="dialog-actions">${opts.onDelete ? `<button type="button" class="ghost-btn danger" data-dlg-del>Xoá</button><span class="spacer"></span>` : ''}
            <button value="cancel" class="ghost-btn" formnovalidate>Huỷ</button><button value="ok" class="primary-btn">${opts.okText || 'Lưu'}</button></div>`;
        form.onsubmit = async (e) => {
            if (e.submitter?.value !== 'ok') return;
            e.preventDefault();
            try {
                await onOk(form);
                dlg().close();
                await load();
                rerender();
                if (opts.done) toast(opts.done);
            } catch (err) {
                form.querySelector('.error').textContent = err.message;
            }
        };
        const del = form.querySelector('[data-dlg-del]');
        if (del) del.onclick = async () => {
            if (!confirm(opts.confirmDelete || 'Xoá mục này?')) return;
            try {
                await opts.onDelete();
                dlg().close();
                await load();
                rerender();
            } catch (err) {
                form.querySelector('.error').textContent = err.message;
            }
        };
        dlg().showModal();
        if (opts.setup) opts.setup(form);
        form.querySelector('input:not([type=radio]):not([type=hidden]), select')?.focus();
    }
    const val = (form, name) => form.elements[name]?.value?.trim() ?? '';
    const moneyIn = (name, v, extra = '') => `<input name="${name}" class="money" inputmode="numeric" autocomplete="off" value="${v || v === 0 ? fmtNum(v) : ''}" ${extra}>`;

    function catOptions(type, selected) {
        return CATS.filter((c) => c.type === type).map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    }
    function openTx(t, preset = {}) {
        const x = t || { type: preset.type || 'out', amount: preset.amount || '', cat: preset.cat || (preset.type === 'in' ? 'khacthu' : 'an'), date: preset.date || todayIso(), note: preset.note || '', sourceId: preset.sourceId || null };
        const srcOpts = `<option value="">Không gắn nguồn</option>` + D.sources.map((s) => `<option value="${s.id}" ${s.id === x.sourceId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
        const body = `
            <div class="seg wide">${[['out', 'Khoản chi'], ['in', 'Khoản thu']].map(([v, l]) => `<label><input type="radio" name="type" value="${v}" ${x.type === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
            <label class="field"><span>Số tiền</span>${moneyIn('amount', x.amount, 'required placeholder="0"')}</label>
            <div class="quick">${[20000, 50000, 100000, 200000, 500000].map((v) => `<button type="button" data-quick="${v}">+${fmtCompact(v)}</button>`).join('')}</div>
            <div class="row2"><label class="field"><span>Danh mục</span><select name="cat">${catOptions(x.type, x.cat)}</select></label>
                <label class="field"><span>Ngày</span><input name="date" type="date" value="${x.date}" required></label></div>
            <label class="field src-field" ${x.type === 'in' && D.sources.length ? '' : 'hidden'}><span>Nguồn thu</span><select name="sourceId">${srcOpts}</select></label>
            <label class="field"><span>Ghi chú</span><input name="note" maxlength="160" value="${esc(x.note || '')}" placeholder="VD: Ăn trưa với bạn"></label>`;
        openDialog(t ? 'Sửa giao dịch' : 'Thêm giao dịch', body, async (form) => {
            const data = {
                type: form.elements.type.value, amount: parseMoney(val(form, 'amount')), cat: val(form, 'cat'),
                date: val(form, 'date'), note: val(form, 'note'), sourceId: form.elements.type.value === 'in' ? val(form, 'sourceId') : ''
            };
            if (!(data.amount > 0)) throw new Error('Nhập số tiền lớn hơn 0');
            await api(t ? 'PUT' : 'POST', 'finance/tx' + (t ? '/' + t.id : ''), data);
        }, {
            done: t ? '' : '✅ Đã thêm giao dịch',
            onDelete: t ? () => api('DELETE', 'finance/tx/' + t.id) : null,
            confirmDelete: 'Xoá giao dịch này?',
            setup: (form) => {
                form.querySelectorAll('input[name=type]').forEach((r) => r.onchange = () => {
                    const type = form.elements.type.value;
                    form.elements.cat.innerHTML = catOptions(type, type === 'in' ? 'khacthu' : 'an');
                    form.querySelector('.src-field').hidden = !(type === 'in' && D.sources.length);
                });
                form.elements.sourceId.onchange = () => {
                    const s = srcById(+form.elements.sourceId.value);
                    if (s) form.elements.cat.value = s.cat;
                };
            }
        });
    }

    function openSource(s, tpl) {
        const t = tpl != null ? SRC_TPL[tpl] : null, cm = curMonth();
        const x = s || { name: t ? t[0] : '', cat: t ? t[1] : 'lamthem', freq: t ? t[2] : 'month', amount: t ? t[3] : '', day: 5, from: t && t[2] === 'once' ? addMonths(cm, 1) : cm, to: null, note: '' };
        const body = `
            <label class="field"><span>Tên nguồn</span><input name="name" maxlength="60" required value="${esc(x.name)}" placeholder="VD: Lương trợ giảng"></label>
            <div class="row2"><label class="field"><span>Danh mục</span><select name="cat">${catOptions('in', x.cat)}</select></label>
                <label class="field"><span>Tần suất</span><select name="freq">${Object.entries(SRC_FREQ).map(([k, l]) => `<option value="${k}" ${x.freq === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
            <div class="row2"><label class="field"><span class="amt-label">Số tiền mỗi lần</span>${moneyIn('amount', x.amount, 'required')}</label>
                <label class="field day-field"><span>Ngày nhận</span><input name="day" type="number" min="1" max="31" value="${x.day || ''}"></label></div>
            <div class="row2"><label class="field"><span class="from-label">Từ tháng</span><input name="from" type="month" value="${x.from}" required></label>
                <label class="field to-field"><span>Đến tháng (không bắt buộc)</span><input name="to" type="month" value="${x.to || ''}"></label></div>
            <label class="field"><span>Ghi chú</span><input name="note" maxlength="120" value="${esc(x.note || '')}"></label>`;
        openDialog(s ? 'Sửa nguồn thu' : 'Thêm nguồn thu nhập', body, async (form) => {
            await api(s ? 'PUT' : 'POST', 'finance/sources' + (s ? '/' + s.id : ''), {
                name: val(form, 'name'), cat: val(form, 'cat'), freq: val(form, 'freq'), amount: parseMoney(val(form, 'amount')),
                day: val(form, 'day'), from: val(form, 'from'), to: val(form, 'to'), note: val(form, 'note')
            });
        }, {
            hint: 'Nguồn thu giúp theo dõi đã nhận hay chưa và ước tính thu nhập các tháng tới.',
            onDelete: s ? () => api('DELETE', 'finance/sources/' + s.id) : null,
            confirmDelete: 'Xoá nguồn này? Các giao dịch đã gắn vẫn được giữ lại.',
            setup: (form) => {
                const sync = () => {
                    const f = form.elements.freq.value;
                    form.querySelector('.to-field').hidden = f === 'once';
                    form.querySelector('.day-field').hidden = f === 'irregular';
                    form.querySelector('.amt-label').textContent = f === 'irregular' ? 'Khoảng mỗi tháng' : f === 'once' ? 'Số tiền' : 'Số tiền mỗi tháng';
                    form.querySelector('.from-label').textContent = f === 'once' ? 'Tháng nhận' : 'Từ tháng';
                };
                form.elements.freq.onchange = sync;
                sync();
            }
        });
    }

    function receiveSource(s) {
        const l = srcLine(s, curMonth());
        openTx(null, { type: 'in', amount: l && l.remain ? l.remain : s.amount, cat: s.cat, sourceId: s.id, note: s.name });
    }

    function openGoal(g, tpl) {
        const t = tpl != null ? GOAL_TPL[tpl] : null, cm = curMonth();
        const x = g || { name: t ? t[0] : '', kind: t ? t[1] : 'save', target: t ? t[2] : '', icon: t ? t[3] : 'target', deadline: addMonths(cm, 6), scope: 'month', from: cm, color: D.goals.length % 8, note: '' };
        const body = `
            <div class="seg wide">${[['save', 'Để dành'], ['income', 'Thu nhập đạt'], ['balance', 'Số dư đạt']].map(([v, l]) => `<label><input type="radio" name="kind" value="${v}" ${x.kind === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
            <label class="field"><span>Tên mục tiêu</span><input name="name" maxlength="60" required value="${esc(x.name)}" placeholder="VD: Mua laptop"></label>
            <div class="row2"><label class="field"><span>Số tiền mục tiêu</span>${moneyIn('target', x.target, 'required')}</label>
                <label class="field"><span class="dl-label">Hạn</span><input name="deadline" type="month" value="${x.deadline || ''}"></label></div>
            <div class="row2 scope-row"><label class="field"><span>Tính thu nhập</span><select name="scope"><option value="month" ${x.scope !== 'range' ? 'selected' : ''}>Trong tháng hạn</option><option value="range" ${x.scope === 'range' ? 'selected' : ''}>Cộng dồn nhiều tháng</option></select></label>
                <label class="field from-field"><span>Từ tháng</span><input name="from" type="month" value="${x.from || cm}"></label></div>
            <div class="field"><span>Biểu tượng</span><div class="pick">${GOAL_ICONS.map((i) => `<label><input type="radio" name="icon" value="${i}" ${x.icon === i ? 'checked' : ''}><span>${ic(i)}</span></label>`).join('')}</div></div>
            <div class="field"><span>Màu</span><div class="pick">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<label><input type="radio" name="color" value="${i}" ${(x.color || 0) === i ? 'checked' : ''}><span class="sw" style="background:var(--c${i})"></span></label>`).join('')}</div></div>`;
        openDialog(g ? 'Sửa mục tiêu' : 'Thêm mục tiêu tài chính', body, async (form) => {
            await api(g ? 'PUT' : 'POST', 'finance/goals' + (g ? '/' + g.id : ''), {
                name: val(form, 'name'), kind: form.elements.kind.value, target: parseMoney(val(form, 'target')),
                deadline: val(form, 'deadline'), scope: val(form, 'scope'), from: val(form, 'from'),
                icon: form.elements.icon.value, color: +form.elements.color.value
            });
        }, {
            onDelete: g ? () => api('DELETE', 'finance/goals/' + g.id) : null,
            confirmDelete: 'Xoá mục tiêu này cùng lịch sử góp?',
            setup: (form) => {
                const sync = () => {
                    const k = form.elements.kind.value;
                    form.querySelector('.scope-row').hidden = k !== 'income';
                    form.querySelector('.from-field').hidden = form.elements.scope.value !== 'range';
                    form.querySelector('.dl-label').textContent = k === 'save' ? 'Hạn (không bắt buộc)' : k === 'income' ? 'Tháng (hạn)' : 'Cuối tháng';
                };
                form.querySelectorAll('input[name=kind]').forEach((r) => r.onchange = sync);
                form.elements.scope.onchange = sync;
                sync();
            }
        });
    }

    function openGoalTx(g, sign) {
        const f = goalInfo(g);
        const def = sign > 0 ? (f.need || '') : '';
        openDialog(sign > 0 ? `Góp vào “${esc(g.name)}”` : `Rút từ “${esc(g.name)}”`, `
            <label class="field"><span>Số tiền</span>${moneyIn('amount', def, 'required')}</label>
            <div class="row2"><label class="field"><span>Ngày</span><input name="date" type="date" value="${todayIso()}" required></label>
                <label class="field"><span>Ghi chú</span><input name="note" maxlength="80"></label></div>`,
        async (form) => {
            const a = parseMoney(val(form, 'amount'));
            if (!(a > 0)) throw new Error('Nhập số tiền lớn hơn 0');
            if (sign < 0 && a > f.saved) throw new Error(`Chỉ rút được tối đa ${fmt(f.saved)}`);
            await api('POST', `finance/goals/${g.id}/tx`, { amount: sign * a, date: val(form, 'date'), note: val(form, 'note') });
        }, {
            hint: sign > 0 ? `Đã để dành ${fmt(f.saved)} / ${fmt(g.target)}. Góp không tạo giao dịch chi, tiền vẫn nằm trong số dư.` : `Đang có ${fmt(f.saved)}.`,
            okText: sign > 0 ? 'Góp' : 'Rút', done: sign > 0 ? '🎯 Đã góp vào mục tiêu' : ''
        });
    }

    function openSettings() {
        const st = D.settings, cb = st.catBudgets || {};
        openDialog('Số dư & ngân sách', `
            <div class="row2"><label class="field"><span>Số dư ban đầu</span>${moneyIn('opening', st.opening)}</label>
                <label class="field"><span>Ngân sách chi mỗi tháng</span>${moneyIn('budget', st.budget || '', 'placeholder="Không đặt"')}</label></div>
            <div class="field"><span>Ngân sách theo danh mục (không bắt buộc)</span><div class="cat-budgets">
                ${CATS.filter((c) => c.type === 'out').map((c) => `<label>${catIc(c, 'sm')}<span class="ellipsis">${esc(c.name)}</span>${moneyIn('cb_' + c.id, cb[c.id] || '', 'placeholder="–"')}</label>`).join('')}</div></div>`,
        async (form) => {
            const catBudgets = {};
            for (const c of CATS) { const v = parseMoney(val(form, 'cb_' + c.id)); if (v > 0) catBudgets[c.id] = v; }
            await api('PUT', 'finance/settings', { opening: parseMoney(val(form, 'opening')), budget: parseMoney(val(form, 'budget')), catBudgets });
        }, { hint: 'Số dư ban đầu là số tiền bạn có trước giao dịch đầu tiên ghi vào sổ (có thể âm nếu đang nợ).', done: 'Đã lưu' });
    }

    // ---------- Sự kiện ----------
    document.addEventListener('click', async (e) => {
        const q = e.target.closest('[data-quick]');
        if (q) {
            const input = q.closest('form').elements.amount;
            input.value = fmtNum(parseMoney(input.value) + +q.dataset.quick);
            return;
        }
        const b = e.target.closest('[data-fa]');
        if (!b) return;
        const a = b.dataset.fa, id = +b.dataset.id;
        const goal = () => D.goals.find((g) => g.id === id);
        try {
            if (a === 'month') { ui.month = addMonths(ui.month, +b.dataset.d); rerender(); }
            else if (a === 'settings') openSettings();
            else if (a === 'tx-add') openTx(null, { date: ui.month === curMonth() ? todayIso() : monthEnd(ui.month) });
            else if (a === 'tx-edit') openTx(D.tx.find((t) => t.id === id));
            else if (a === 'tx-type') { ui.txType = b.dataset.v; rerender(); }
            else if (a === 'src-add') openSource(null, b.dataset.tpl);
            else if (a === 'src-edit') openSource(srcById(id));
            else if (a === 'src-receive') receiveSource(srcById(id));
            else if (a === 'goal-new') openGoal(null, b.dataset.tpl);
            else if (a === 'goal-edit') openGoal(goal());
            else if (a === 'goal-add') openGoalTx(goal(), 1);
            else if (a === 'goal-take') openGoalTx(goal(), -1);
            else if (a === 'goal-done' || a === 'goal-reopen') {
                await api('PATCH', 'finance/goals/' + id, { done: a === 'goal-done' });
                await load(); rerender();
                if (a === 'goal-done') toast('🎉 Đã hoàn thành mục tiêu');
            } else if (a === 'gtx-del') {
                if (!confirm('Xoá lần góp này?')) return;
                await api('DELETE', 'finance/gtx/' + id);
                await load(); rerender();
            } else if (a === 'fc-n') { ui.fcN = +b.dataset.n; rerender(); }
            else if (a === 'sc-type') { ui.scType = b.dataset.v; rerender(); }
            else if (a === 'scen-del') { ui.scen.splice(+b.dataset.i, 1); saveScen(); rerender(); }
            else if (a === 'scen-clear') { ui.scen = []; saveScen(); rerender(); }
        } catch (err) {
            toast(err.message);
        }
    });

    let qTimer;
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.classList.contains('money')) {
            const neg = /^\s*[-−]/.test(el.value) && el.name === 'opening';
            const digits = el.value.replace(/[^\d]/g, '');
            el.value = (neg ? '-' : '') + (digits ? fmtNum(+digits) : '');
        }
        if (el.dataset.ff === 'q') {
            clearTimeout(qTimer);
            qTimer = setTimeout(() => {
                ui.q = el.value;
                const pos = el.selectionStart;
                rerender();
                const again = document.querySelector('[data-ff="q"]');
                if (again) { again.focus(); again.setSelectionRange(pos, pos); }
            }, 250);
        }
    });
    document.addEventListener('change', (e) => {
        const f = e.target.dataset.ff;
        if (f === 'cat') { ui.txCat = e.target.value; rerender(); }
        else if (f === 'fco') { ui.fcOther = e.target.checked; rerender(); }
        else if (f === 'fce') { ui.fcExp = e.target.checked; rerender(); }
    });
    document.addEventListener('submit', (e) => {
        if (e.target.id !== 'scenForm') return;
        e.preventDefault();
        const form = e.target, amount = parseMoney(val(form, 'amount')), from = val(form, 'from');
        if (!(amount > 0) || !from) return toast('Nhập số tiền và tháng bắt đầu');
        ui.scen.push({ type: ui.scType, name: val(form, 'name'), amount, from, to: val(form, 'to') || null });
        saveScen();
        rerender();
    });
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => view.startsWith('f:') && afterRender(), 150); });

    return {
        VIEWS, load, main, side, header, afterRender, navBadges, openTx, openSource, openGoal,
        isView: (v) => v in VIEWS,
        addAction: () => (view === 'f:sources' ? openSource() : view === 'f:goals' ? openGoal() : openTx(null, { date: ui.month && ui.month !== curMonth() ? monthEnd(ui.month) : todayIso() })),
        summary: () => (loaded ? { balance: balanceAt(null), month: monthStats(curMonth()) } : null),
        fmt, fmtCompact
    };
})();
