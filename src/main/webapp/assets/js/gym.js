/* =========================================================
   Tập luyện — nhật ký gym cá nhân
   Dùng chung các hàm của app.js: api, $, esc, toast, ICON, todayIso, view, render, ring.
   ========================================================= */
const Gym = (() => {
    const SVG = {
        dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
        list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
        trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
        scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 9.5a5 5 0 0 1 7 0L12 12z"/>',
        flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.2 2.3-5.3 3.6-7.8.4 2 1.4 3 2.4 3.4C11.4 7 13 4.5 15 3c-.3 3 3.5 5.6 3.5 11.2C18.5 18.2 16 21 12 21z"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
        repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
        x: '<path d="M7 7l10 10M17 7L7 17"/>',
        calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>'
    };
    const ic = (name) => `<svg viewBox="0 0 24 24">${SVG[name]}</svg>`;

    const MUSCLES = {
        nguc: { name: 'Ngực', hue: 352 },
        lung: { name: 'Lưng', hue: 200 },
        vai: { name: 'Vai', hue: 28 },
        tay: { name: 'Tay', hue: 262 },
        chan: { name: 'Chân & mông', hue: 150 },
        bung: { name: 'Bụng', hue: 48 },
        khac: { name: 'Toàn thân / khác', hue: 230 }
    };
    const MAIN_MUSCLES = ['nguc', 'lung', 'vai', 'tay', 'chan'];
    const muscle = (id) => MUSCLES[id] || MUSCLES.khac;
    const mdot = (id) => `<i class="mdot" style="--h:${muscle(id).hue}"></i>`;

    const LIB = [
        ['Bench Press', 'nguc'], ['Incline Bench Press', 'nguc'], ['Incline Dumbbell Press', 'nguc'], ['Dumbbell Bench Press', 'nguc'],
        ['Chest Fly', 'nguc'], ['Cable Crossover', 'nguc'], ['Push-up', 'nguc'], ['Dips', 'nguc'],
        ['Deadlift', 'lung'], ['Pull-up', 'lung'], ['Chin-up', 'lung'], ['Lat Pulldown', 'lung'], ['Barbell Row', 'lung'],
        ['Dumbbell Row', 'lung'], ['Seated Cable Row', 'lung'], ['T-Bar Row', 'lung'],
        ['Overhead Press', 'vai'], ['Dumbbell Shoulder Press', 'vai'], ['Lateral Raise', 'vai'], ['Rear Delt Fly', 'vai'], ['Face Pull', 'vai'], ['Shrug', 'vai'],
        ['Bicep Curl', 'tay'], ['Hammer Curl', 'tay'], ['Preacher Curl', 'tay'], ['Tricep Pushdown', 'tay'], ['Skull Crusher', 'tay'], ['Overhead Tricep Extension', 'tay'],
        ['Squat', 'chan'], ['Front Squat', 'chan'], ['Leg Press', 'chan'], ['Romanian Deadlift', 'chan'], ['Lunge', 'chan'], ['Bulgarian Split Squat', 'chan'],
        ['Leg Extension', 'chan'], ['Leg Curl', 'chan'], ['Hip Thrust', 'chan'], ['Calf Raise', 'chan'],
        ['Plank', 'bung'], ['Crunch', 'bung'], ['Hanging Leg Raise', 'bung'], ['Cable Crunch', 'bung'], ['Russian Twist', 'bung'],
        ['Kettlebell Swing', 'khac'], ['Burpee', 'khac'], ['Farmer Walk', 'khac']
    ];
    const TPL = {
        Push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raise', 'Tricep Pushdown'],
        Pull: ['Deadlift', 'Pull-up', 'Barbell Row', 'Face Pull', 'Bicep Curl'],
        Legs: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
        Upper: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Bicep Curl', 'Tricep Pushdown'],
        Lower: ['Squat', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Leg Extension', 'Calf Raise', 'Plank'],
        'Full body': ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Plank']
    };

    const VIEWS = {
        'g:overview': 'Tổng quan tập luyện',
        'g:log': 'Nhật ký tập',
        'g:ex': 'Bài tập & kỷ lục',
        'g:body': 'Chỉ số cơ thể'
    };

    // ---------- Trạng thái ----------
    let D = { settings: { weekTarget: 3 }, workouts: [], body: [] };
    let S = { ex: {}, pr: new Map() };
    let loaded = false;
    const ui = { month: null, muscle: 'all', q: '', ex: null, exMuscle: 'all', range: 90, calcW: '', calcR: '' };

    async function load() {
        D = await api('GET', 'gym');
        compute();
        loaded = true;
    }

    // ---------- Thời gian & định dạng ----------
    const pad = (n) => String(n).padStart(2, '0');
    const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toDate = (iso) => new Date(iso + 'T00:00');
    const addDays = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return isoD(d); };
    const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
    const weekStart = (iso) => addDays(iso, -((toDate(iso).getDay() + 6) % 7));
    const curMonth = () => todayIso().slice(0, 7);
    function addMonths(k, n) {
        const [y, m] = k.split('-').map(Number);
        const t = y * 12 + (m - 1) + n;
        return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
    }
    const monthLabel = (k) => `Tháng ${+k.slice(5)}, ${k.slice(0, 4)}`;
    const fmtDM = (d) => `${+d.slice(8, 10)}/${+d.slice(5, 7)}`;
    const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const fmtDay = (d) => toDate(d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const one = (x) => (Math.round(x * 10) / 10).toLocaleString('vi-VN');
    const fmtNum = (n) => Math.round(n).toLocaleString('vi-VN');
    const kg = (n) => (Math.round(n * 100) / 100).toLocaleString('vi-VN');
    const fmtVol = (v) => `${fmtNum(v)} kg`;
    const compact = (v) => (v >= 1000 ? one(v / 1000) + 'k' : String(Math.round(v)));
    const agoText = (d) => {
        const n = daysBetween(d, todayIso());
        return n <= 0 ? 'hôm nay' : n === 1 ? 'hôm qua' : `${n} ngày trước`;
    };

    // ---------- Tính toán ----------
    const e1rm = (s) => (s.weight > 0 ? s.weight * (1 + Math.min(s.reps, 15) / 30) : 0);
    /** Có tạ luôn hơn không tạ; không tạ thì so số lần. */
    const score = (s) => (s.weight > 0 ? 1000 + e1rm(s) : s.reps);
    const vol = (sets) => sets.reduce((a, s) => a + s.reps * s.weight, 0);

    function groupEx(sets) {
        const m = new Map();
        for (const s of sets) {
            if (!m.has(s.exercise)) m.set(s.exercise, { name: s.exercise, muscle: s.muscle, sets: [] });
            m.get(s.exercise).sets.push(s);
        }
        return [...m.values()];
    }

    function compute() {
        const asc = [...D.workouts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
        const ex = {}, pr = new Map();
        for (const w of asc) {
            for (const g of groupEx(w.sets)) {
                const e = ex[g.name] || (ex[g.name] = { name: g.name, muscle: g.muscle, hist: [], best: null, maxW: 0, sessions: 0, bw: true });
                const top = g.sets.reduce((b, s) => (score(s) > score(b) ? s : b));
                const sc = score(top);
                if (e.best && sc > e.best.score) {
                    if (!pr.has(w.id)) pr.set(w.id, []);
                    pr.get(w.id).push({ name: g.name, set: top, prev: e.best, date: w.date, wid: w.id });
                }
                if (!e.best || sc > e.best.score) e.best = { ...top, score: sc, date: w.date };
                e.muscle = g.muscle;
                e.maxW = Math.max(e.maxW, ...g.sets.map((s) => s.weight));
                if (g.sets.some((s) => s.weight > 0)) e.bw = false;
                e.sessions++;
                e.last = w.date;
                e.lastSets = g.sets;
                e.hist.push({ date: w.date, score: sc, top, e1rm: e1rm(top), vol: vol(g.sets), reps: g.sets.reduce((a, s) => a + s.reps, 0) });
            }
        }
        S = { ex, pr };
    }

    const workoutsIn = (from, to) => D.workouts.filter((w) => w.date >= from && w.date <= to);
    function weekly(n) {
        const out = [], ws0 = weekStart(todayIso());
        for (let i = n - 1; i >= 0; i--) {
            const ws = addDays(ws0, -7 * i), list = workoutsIn(ws, addDays(ws, 6));
            out.push({ ws, count: list.length, vol: list.reduce((a, w) => a + vol(w.sets), 0), sets: list.reduce((a, w) => a + w.sets.length, 0) });
        }
        return out;
    }
    function streak() {
        const t = D.settings.weekTarget || 3;
        const cnt = {};
        for (const w of D.workouts) { const k = weekStart(w.date); cnt[k] = (cnt[k] || 0) + 1; }
        let ws = weekStart(todayIso()), n = 0;
        if ((cnt[ws] || 0) >= t) n = 1;
        ws = addDays(ws, -7);
        while ((cnt[ws] || 0) >= t && n < 520) { n++; ws = addDays(ws, -7); }
        return n;
    }
    function muscleSets(from, to) {
        const by = {};
        for (const w of workoutsIn(from, to)) for (const s of w.sets) by[s.muscle] = (by[s.muscle] || 0) + 1;
        return by;
    }
    function lastTrained(m) {
        const w = D.workouts.find((x) => x.sets.some((s) => s.muscle === m));
        return w ? w.date : null;
    }
    const recentPRs = (days = 30) => [...S.pr.values()].flat()
        .filter((p) => daysBetween(p.date, todayIso()) <= days).sort((a, b) => (a.date < b.date ? 1 : -1));
    const bodyAsc = () => [...D.body].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    const latestBody = () => D.body[0] || null;
    function bodyAt(daysAgo) {
        const lim = addDays(todayIso(), -daysAgo);
        return D.body.find((b) => b.date <= lim) || null;
    }
    const bmi = (w) => (D.settings.height ? w / Math.pow(D.settings.height / 100, 2) : null);
    function bmiLabel(b) {
        if (b < 18.5) return ['Thiếu cân', 'orange'];
        if (b < 23) return ['Bình thường', 'green'];
        if (b < 25) return ['Thừa cân', 'orange'];
        return ['Béo phì', 'red'];
    }
    const bestText = (e) => (e.bw ? `${e.best.reps} lần` : `${kg(e.best.weight)} kg × ${e.best.reps}`);
    function setsText(sets) {
        const ws = new Set(sets.map((s) => s.weight));
        if (ws.size === 1) {
            const w = sets[0].weight;
            return `${sets.map((s) => s.reps).join(' · ')}${w ? ` × ${kg(w)} kg` : ' lần'}`;
        }
        return sets.map((s) => (s.weight ? `${kg(s.weight)}×${s.reps}` : `${s.reps}`)).join(' · ');
    }

    // ---------- Thành phần dùng chung ----------
    function deltaPill(cur, prev, upGood) {
        if (!prev) return '';
        const pct = ((cur - prev) / Math.abs(prev)) * 100;
        if (Math.abs(pct) < 0.05) return '<span class="delta">0%</span>';
        const up = pct > 0, good = up === upGood;
        return `<span class="delta ${good ? 'good' : 'bad'}">${up ? '↑' : '↓'} ${one(Math.abs(pct))}%</span>`;
    }
    const kpi = (label, icon, color, value, foot) => `
        <div class="kpi"><div class="kpi-top"><span>${label}</span><span class="stat-icon ${color}">${icon}</span></div>
            <div class="kpi-val">${value}</div><p class="kpi-foot">${foot}</p></div>`;
    const card = (title, sub, body, right = '', cls = '') => `
        <section class="card ${cls}"><div class="card-head"><div class="card-title"><span>${title}</span>${sub ? `<small>${sub}</small>` : ''}</div>
            <span class="spacer"></span>${right}</div><div class="card-body">${body}</div></section>`;
    const emptyBox = (title, text, btn = '') => `<div class="empty"><b>${title}</b>${text}${btn ? `<div class="empty-btn">${btn}</div>` : ''}</div>`;
    const addBtn = (label = 'Ghi buổi tập') => `<button class="primary-btn" data-ga="w-add">${ICON.plus}${label}</button>`;

    function wkItem(w, compactList) {
        const groups = groupEx(w.sets), prs = S.pr.get(w.id) || [];
        const shown = compactList ? groups.slice(0, 3) : groups;
        const meta = [`${groups.length} bài`, `${w.sets.length} set`];
        if (vol(w.sets)) meta.push(fmtVol(vol(w.sets)));
        if (w.duration) meta.push(`${w.duration} phút`);
        return `<div class="wk" role="button" tabindex="0" data-ga="w-edit" data-id="${w.id}">
            <div class="wk-date"><b>${+w.date.slice(8)}</b><small>${WD[toDate(w.date).getDay()]}</small></div>
            <div class="wk-main">
                <div class="wk-t"><b>${esc(w.title)}</b>${prs.length ? `<span class="chip pr">${ic('trophy')}${prs.length} kỷ lục</span>` : ''}</div>
                <div class="wk-meta">${meta.join(' · ')}${w.note ? ` · <i>${esc(w.note)}</i>` : ''}</div>
                ${shown.length ? `<ul class="wk-ex">${shown.map((g) => `<li>${mdot(g.muscle)}<span class="ellipsis">${esc(g.name)}</span>
                    <span class="muted">${setsText(g.sets)}</span></li>`).join('')}
                    ${groups.length > shown.length ? `<li class="muted more">+${groups.length - shown.length} bài khác</li>` : ''}</ul>` : ''}
            </div>
            <button class="ghost-btn sm" data-ga="w-repeat" data-id="${w.id}" title="Tạo buổi mới giống buổi này">${ic('repeat')}Lặp lại</button>
        </div>`;
    }

    // ---------- Biểu đồ ----------
    function niceStep(raw) {
        const mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
        return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
    }
    function barPath(x, y, w, h, fill, title, cls = '') {
        if (h < 0.5) return '';
        const r = Math.min(cls ? 7 : 4, w / 2, h);
        const cap = cls && h > 10 ? `<rect class="cap ${cls}" x="${x + 3}" y="${y + 3}" width="${Math.max(0, w - 6)}" height="3" rx="1.5"/>` : '';
        return `<path class="bar ${cls}" d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z" fill="${fill}"><title>${title}</title></path>${cap}`;
    }
    function drawVolume() {
        const el = document.getElementById('gVol');
        if (!el) return;
        const data = weekly(8);
        const W = Math.max(260, el.clientWidth), H = 220, ml = 44, mr = 6, mt = 18, mb = 26, pw = W - ml - mr, ph = H - mt - mb;
        const max = Math.max(1000, ...data.map((d) => d.vol)), step = niceStep(max / 4), top = Math.ceil(max / step) * step;
        const y = (v) => mt + ph - (v / top) * ph, band = pw / data.length, bw = Math.max(8, Math.min(34, band * 0.55));
        let g = '';
        for (let v = 0; v <= top + 1e-6; v += step) {
            const yy = Math.round(y(v)) + 0.5;
            g += `<line x1="${ml}" x2="${W - mr}" y1="${yy}" y2="${yy}" class="${v ? 'grid' : 'base'}"/>`
                + `<text x="${ml - 8}" y="${yy}" class="tick" text-anchor="end" dominant-baseline="middle">${compact(v)}</text>`;
        }
        data.forEach((d, i) => {
            const bx = ml + band * i + (band - bw) / 2, last = i === data.length - 1;
            g += barPath(bx, y(d.vol), bw, y(0) - y(d.vol), last ? 'var(--accent)' : 'var(--c5)', `Tuần ${fmtDM(d.ws)} · ${d.count} buổi · ${fmtVol(d.vol)}`, last ? 'hl' : 'past');
            if (d.count) g += `<text x="${bx + bw / 2}" y="${y(d.vol) - 6}" text-anchor="middle" class="vlab">${band < 46 ? d.count : d.count + ' buổi'}</text>`;
            g += `<text x="${bx + bw / 2}" y="${H - 6}" text-anchor="middle" class="xl ${last ? 'cur' : ''}">${fmtDM(d.ws)}</text>`;
        });
        el.innerHTML = `<svg width="${W}" height="${H}">${g}</svg>`;
    }
    /** Biểu đồ đường theo ngày: pts = [{d, y, t}] (tăng dần theo ngày). */
    function lineChart(el, pts, o = {}) {
        if (!el) return;
        if (!pts.length) { el.innerHTML = `<div class="empty">${o.empty || 'Chưa có dữ liệu'}</div>`; return; }
        const W = Math.max(260, el.clientWidth), H = o.h || 220, ml = 44, mr = 14, mt = 14, mb = 26, pw = W - ml - mr, ph = H - mt - mb;
        const vals = pts.map((p) => p.y).concat(o.target ? [o.target] : []);
        let lo = Math.min(...vals), hi = Math.max(...vals);
        const padV = (hi - lo) * 0.15 || Math.max(1, hi * 0.05);
        lo -= padV; hi += padV;
        const step = niceStep((hi - lo) / 4);
        lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
        const t0 = toDate(pts[0].d).getTime(), t1 = toDate(pts[pts.length - 1].d).getTime();
        const x = (d) => (t1 === t0 ? ml + pw / 2 : ml + ((toDate(d).getTime() - t0) / (t1 - t0)) * pw);
        const y = (v) => mt + ph - ((v - lo) / (hi - lo)) * ph;
        let g = '';
        for (let v = lo; v <= hi + 1e-6; v += step) {
            const yy = Math.round(y(v)) + 0.5;
            g += `<line x1="${ml}" x2="${W - mr}" y1="${yy}" y2="${yy}" class="grid"/>`
                + `<text x="${ml - 8}" y="${yy}" class="tick" text-anchor="end" dominant-baseline="middle">${one(v)}</text>`;
        }
        if (o.target) {
            const ty = y(o.target);
            g += `<line x1="${ml}" x2="${W - mr}" y1="${ty}" y2="${ty}" stroke="var(--green)" stroke-width="1.5" stroke-dasharray="5 4"/>`
                + `<text x="${ml + 6}" y="${ty - 6}" class="vlab" style="fill:var(--green)">Mục tiêu ${one(o.target)}</text>`;
        }
        const color = o.color || 'var(--accent)';
        const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
        if (pts.length > 1) {
            g += `<path d="${line}L${x(pts[pts.length - 1].d).toFixed(1)},${mt + ph}L${x(pts[0].d).toFixed(1)},${mt + ph}Z" fill="${color}" opacity=".08"/>`
                + `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
        }
        const dots = pts.length <= 40;
        pts.forEach((p, i) => {
            if (dots || i === pts.length - 1) {
                g += `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 3.2}" fill="${p.pr ? 'var(--orange)' : color}" stroke="var(--card)" stroke-width="1.5" class="bar"><title>${p.t}</title></circle>`;
            }
        });
        const nl = Math.min(6, pts.length);
        for (let i = 0; i < nl; i++) {
            const p = pts[nl === 1 ? 0 : Math.round((i * (pts.length - 1)) / (nl - 1))];
            g += `<text x="${x(p.d).toFixed(1)}" y="${H - 6}" text-anchor="${nl > 1 && i === 0 ? 'start' : nl > 1 && i === nl - 1 ? 'end' : 'middle'}" class="xl">${fmtDM(p.d)}</text>`;
        }
        el.innerHTML = `<svg width="${W}" height="${H}">${g}</svg>`;
    }
    function drawExercise() {
        const el = document.getElementById('gEx'), e = S.ex[ui.ex];
        if (!el || !e) return;
        const prDates = new Set([...S.pr.values()].flat().filter((p) => p.name === e.name).map((p) => p.date));
        lineChart(el, e.hist.map((h) => ({
            d: h.date, y: e.bw ? h.top.reps : h.e1rm, pr: prDates.has(h.date),
            t: `${fmtDM(h.date)} · ${e.bw ? `${h.top.reps} lần` : `${kg(h.top.weight)} kg × ${h.top.reps} → 1RM ≈ ${one(h.e1rm)} kg`}${prDates.has(h.date) ? ' · Kỷ lục' : ''}`
        })), { empty: 'Chưa có buổi nào cho bài này' });
    }
    function drawBody() {
        const el = document.getElementById('gBody');
        if (!el) return;
        const from = ui.range ? addDays(todayIso(), -ui.range) : '0000';
        lineChart(el, bodyAsc().filter((b) => b.date >= from).map((b) => ({ d: b.date, y: b.weight, t: `${fmtDM(b.date)} · ${kg(b.weight)} kg` })),
            { target: D.settings.targetWeight, color: 'var(--c3)', empty: 'Chưa có số đo trong khoảng này' });
    }
    function afterRender() { drawVolume(); drawExercise(); drawBody(); }

    // ---------- Header ----------
    function header() {
        if (!ui.month) ui.month = curMonth();
        const v = view, wk = weekly(1)[0], t = D.settings.weekTarget || 3;
        const settings = `<button class="ghost-btn" data-ga="settings">${ic('gear')}Mục tiêu tập</button>`;
        const monthChip = `<div class="month-chip">
            <button class="icon-btn" data-ga="month" data-d="-1" title="Tháng trước"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
            <span>${ICON.cal}${monthLabel(ui.month)}</span>
            <button class="icon-btn" data-ga="month" data-d="1" title="Tháng sau" ${ui.month >= curMonth() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
        let actions = '', sub = '';
        if (v === 'g:overview') {
            actions = settings;
            const s = streak();
            sub = `Tuần này ${wk.count}/${t} buổi${s ? ` · chuỗi ${s} tuần đạt mục tiêu 🔥` : ''}`;
        } else if (v === 'g:log') {
            actions = monthChip;
            sub = `${D.workouts.filter((w) => w.date.startsWith(ui.month)).length} buổi tập trong ${monthLabel(ui.month).toLowerCase()}`;
        } else if (v === 'g:ex') {
            sub = `${Object.keys(S.ex).length} bài tập đã ghi · ${recentPRs(30).length} kỷ lục trong 30 ngày`;
        } else if (v === 'g:body') {
            actions = settings;
            const b = latestBody();
            sub = b ? `Lần cân gần nhất: ${kg(b.weight)} kg, ${agoText(b.date)}` : 'Ghi cân nặng đều đặn để thấy xu hướng';
        }
        return { title: VIEWS[v], sub, actions, add: v === 'g:body' ? 'Ghi cân nặng' : 'Ghi buổi tập' };
    }

    // ---------- Trang: Tổng quan ----------
    function overviewMain() {
        const w2 = weekly(2), wk = w2[1], prev = w2[0], t = D.settings.weekTarget || 3;
        const s = streak(), b = latestBody(), b30 = bodyAt(30);
        const kpis = `<section class="card kpis">
            ${kpi('Buổi tập tuần này', ic('dumbbell'), 'blue', `${wk.count}<span class="cur">/ ${t}</span>`,
                wk.count >= t ? '<span class="delta good">Đã đạt mục tiêu tuần</span>' : `Còn ${t - wk.count} buổi để đạt mục tiêu`)}
            ${kpi('Chuỗi tuần', ic('flame'), 'orange', `${s}<span class="cur">tuần</span>`, s ? 'Liên tiếp đạt mục tiêu' : 'Đạt mục tiêu tuần để bắt đầu chuỗi')}
            ${kpi('Khối lượng tuần', ic('trophy'), 'green', `${fmtNum(wk.vol)}<span class="cur">kg</span>`,
                !wk.vol && prev.vol ? `Tuần trước ${fmtVol(prev.vol)}` : prev.vol ? `${deltaPill(wk.vol, prev.vol, true)} so với tuần trước` : `${wk.sets} set trong tuần`)}
            ${kpi('Cân nặng', ic('scale'), 'purple', b ? `${kg(b.weight)}<span class="cur">kg</span>` : '—',
                b ? (b30 && b30.id !== b.id ? `${b.weight - b30.weight >= 0 ? '+' : '−'}${kg(Math.abs(b.weight - b30.weight))} kg trong 30 ngày` : agoText(b.date))
                    : '<button class="link" data-ga="body-add">Ghi cân nặng</button>')}
        </section>`;
        if (!D.workouts.length) {
            return kpis + `<section class="card">${emptyBox('Chưa có buổi tập nào', 'Ghi buổi tập đầu tiên: chọn mẫu Push / Pull / Legs hoặc tự thêm bài tập.', addBtn())}</section>`;
        }
        const volCard = card('Khối lượng 8 tuần', 'Tổng số kg × số lần mỗi tuần', '<div class="chart" id="gVol"></div>');
        const recent = card('Buổi tập gần đây', '', `<div class="wk-list">${D.workouts.slice(0, 3).map((w) => wkItem(w, true)).join('')}</div>`,
            `<button class="link-btn" data-view="g:log">Xem tất cả ${ICON.arrow}</button>`, 'flush');
        return kpis + volCard + heatmapCard() + recent;
    }

    function heatmapCard() {
        const weeks = 18, today = todayIso(), start = addDays(weekStart(today), -7 * (weeks - 1));
        const byDay = {};
        for (const w of D.workouts) if (w.date >= start) byDay[w.date] = (byDay[w.date] || 0) + Math.max(1, vol(w.sets));
        const vs = Object.values(byDay).sort((a, b) => a - b);
        const q = (p) => vs[Math.min(vs.length - 1, Math.floor(p * vs.length))] || 0;
        const lv = (v) => (!v ? 0 : v <= q(0.25) ? 1 : v <= q(0.5) ? 2 : v <= q(0.75) ? 3 : 4);
        let cells = '', months = '';
        for (let i = 0; i < weeks * 7; i++) {
            const d = addDays(start, i), v = byDay[d];
            cells += `<i class="hm l${d > today ? 'f' : lv(v)}" title="${fmtDay(d)}${v ? ` · ${D.workouts.filter((w) => w.date === d).map((w) => esc(w.title)).join(', ')}` : ''}"></i>`;
        }
        for (let wI = 0; wI < weeks; wI++) {
            const d = addDays(start, wI * 7);
            const showM = wI === 0 || d.slice(5, 7) !== addDays(d, -7).slice(5, 7);
            months += `<span>${showM ? `T${+d.slice(5, 7)}` : ''}</span>`;
        }
        const days = Object.keys(byDay).length;
        return card('Lịch tập', `${days} ngày tập trong ${weeks} tuần qua`, `
            <div class="hm-wrap"><div class="hm-days"><span>T2</span><span></span><span>T4</span><span></span><span>T6</span><span></span><span>CN</span></div>
                <div><div class="hm-months" style="--w:${weeks}">${months}</div><div class="hm-grid" style="--w:${weeks}">${cells}</div></div></div>
            <div class="hm-legend">Ít <i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> Nhiều</div>`);
    }

    function suggestions() {
        const out = [], today = todayIso(), t = D.settings.weekTarget || 3, wk = weekly(1)[0];
        if (!D.workouts.length) {
            out.push({ html: 'Bắt đầu bằng một buổi tập: chọn mẫu <b>Push / Pull / Legs</b> trong hộp thoại để có sẵn danh sách bài.', btn: `<button class="ghost-btn" data-ga="w-add">${ICON.plus}Ghi buổi tập</button>` });
        } else {
            if (wk.count < t) {
                const left = 7 - ((toDate(today).getDay() + 6) % 7);
                out.push({ html: `Tuần này còn <b>${t - wk.count} buổi</b> để đạt mục tiêu ${t} buổi (còn ${left} ngày).`, btn: D.workouts.some((w) => w.date === today) ? '' : `<button class="ghost-btn" data-ga="w-add">${ICON.plus}Ghi buổi hôm nay</button>` });
            }
            if (D.workouts.length >= 3) {
                for (const m of MAIN_MUSCLES) {
                    const last = lastTrained(m), n = last ? daysBetween(last, today) : null;
                    if (n === null || n >= 9) out.push({ html: n === null ? `Bạn chưa ghi bài nào cho nhóm <b>${muscle(m).name}</b>.` : `Đã <b>${n} ngày</b> chưa tập <b>${muscle(m).name}</b>.` });
                }
            }
            for (const e of Object.values(S.ex)) {
                if (e.hist.length < 4 || daysBetween(e.last, today) > 21) continue;
                const last4 = e.hist.slice(-4), before = e.hist.slice(0, -4);
                const bestBefore = Math.max(0, ...before.map((h) => h.score)), firstScore = last4[0].score;
                if (Math.max(...last4.slice(1).map((h) => h.score)) <= Math.max(firstScore, bestBefore)) {
                    out.push({ html: `<b>${esc(e.name)}</b> chưa tăng sau 4 buổi gần nhất. Thử giảm tạ một tuần (deload) hoặc đổi số lần.`, btn: `<button class="ghost-btn" data-ga="ex-pick" data-name="${esc(e.name)}">Xem tiến độ</button>` });
                }
            }
        }
        const b = latestBody();
        if (!b || daysBetween(b.date, today) >= 7) out.push({ html: b ? `Đã ${daysBetween(b.date, today)} ngày chưa cân. Cân vào cùng giờ mỗi tuần để số liệu chính xác.` : 'Ghi <b>cân nặng</b> để theo dõi xu hướng cơ thể cùng với buổi tập.', btn: `<button class="ghost-btn" data-ga="body-add">${ICON.plus}Ghi cân nặng</button>` });
        return out.slice(0, 5);
    }

    function weekCard() {
        const t = D.settings.weekTarget || 3, ws = weekStart(todayIso()), wk = weekly(1)[0], today = todayIso();
        const pct = Math.min(100, (wk.count / t) * 100);
        const days = [...Array(7)].map((_, i) => {
            const d = addDays(ws, i), done = D.workouts.some((w) => w.date === d);
            return `<span class="wd ${done ? 'on' : ''} ${d === today ? 'today' : ''}" title="${fmtDay(d)}">${WD[(i + 1) % 7]}</span>`;
        }).join('');
        return `<section class="card"><div class="card-head"><div class="card-title"><span>Mục tiêu tuần</span><small>${fmtDM(ws)} – ${fmtDM(addDays(ws, 6))}</small></div>
            <span class="spacer"></span><button class="icon-btn small" data-ga="settings" title="Đổi mục tiêu">${ic('gear')}</button></div>
            <div class="card-body"><div class="ring-row static">${ring(pct, wk.count >= t ? 'var(--green)' : 'var(--accent)')}
                <span class="ring-info"><span>${wk.count} / ${t} buổi</span><b>${Math.round(pct)}%</b></span></div>
                <div class="wdays">${days}</div></div></section>`;
    }

    function prCard(n = 5) {
        const list = recentPRs(60).slice(0, n);
        return card('Kỷ lục gần đây', '60 ngày qua', list.length ? `<div class="pr-list">${list.map((p) => {
            const e = S.ex[p.name];
            return `<button class="pr-row" data-ga="ex-pick" data-name="${esc(p.name)}"><span class="pr-ic">${ic('trophy')}</span>
                <span class="pr-main"><b class="ellipsis">${esc(p.name)}</b><small>${fmtDM(p.date)} · trước đó ${e.bw ? `${p.prev.reps} lần` : `${kg(p.prev.weight)}×${p.prev.reps}`}</small></span>
                <span class="pr-val">${e.bw || !p.set.weight ? `${p.set.reps} lần` : `${kg(p.set.weight)} kg × ${p.set.reps}`}</span></button>`;
        }).join('')}</div>` : '<p class="muted small-p">Chưa có kỷ lục mới. Tăng tạ hoặc số lần so với lần trước để lập kỷ lục.</p>', '', 'flush');
    }

    function musclesCard(from, to, title, sub) {
        const by = muscleSets(from, to), total = Object.values(by).reduce((a, b) => a + b, 0);
        const max = Math.max(1, ...Object.values(by));
        const rows = Object.keys(MUSCLES).filter((m) => by[m] || MAIN_MUSCLES.includes(m)).sort((a, b) => (by[b] || 0) - (by[a] || 0)).map((m) => `
            <div class="crow"><div class="crow-l">${mdot(m)}<span class="ellipsis">${muscle(m).name}</span></div>
                <div class="crow-v">${by[m] || 0} set<small>${total ? Math.round(((by[m] || 0) / total) * 100) : 0}%</small></div>
                <div class="track" style="--h:${muscle(m).hue}"><i style="width:${((by[m] || 0) / max) * 100}%"></i></div></div>`).join('');
        return card(title, sub, `<div class="crows">${rows}</div>`);
    }

    function overviewSide() {
        const sug = suggestions(), today = todayIso();
        const sugCard = `<section class="card"><div class="card-head"><span class="spark"></span><div class="card-title"><span>Việc nên làm</span></div></div>
            <div class="card-body pad sugg">${sug.map((s, i) => `<div class="sg"><span class="sg-n">${pad(i + 1)}</span><div><p>${s.html}</p>${s.btn || ''}</div></div>`).join('')
            || '<p class="muted">Lịch tập đang rất đều 💪</p>'}</div></section>`;
        return weekCard() + sugCard + prCard(4) + musclesCard(addDays(today, -29), today, 'Nhóm cơ 30 ngày', 'Số set theo nhóm cơ');
    }

    // ---------- Trang: Nhật ký ----------
    function logMain() {
        const q = ui.q.trim().toLowerCase();
        const list = D.workouts.filter((w) => w.date.startsWith(ui.month)
            && (ui.muscle === 'all' || w.sets.some((s) => s.muscle === ui.muscle))
            && (!q || w.title.toLowerCase().includes(q) || (w.note || '').toLowerCase().includes(q) || w.sets.some((s) => s.exercise.toLowerCase().includes(q))));
        const filters = `<div class="filters">
            <label class="search">${ICON_SEARCH}<input data-gf="q" placeholder="Tìm theo tên buổi, bài tập, ghi chú…" value="${esc(ui.q)}"></label>
            <select data-gf="muscle"><option value="all">Mọi nhóm cơ</option>${Object.entries(MUSCLES).map(([id, m]) => `<option value="${id}" ${ui.muscle === id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>`;
        let body = '';
        if (!list.length) {
            body = emptyBox(D.workouts.length ? 'Không có buổi tập phù hợp' : 'Chưa có buổi tập nào',
                D.workouts.length ? 'Thử đổi bộ lọc hoặc chọn tháng khác.' : 'Ghi buổi đầu tiên để bắt đầu theo dõi tiến độ.', addBtn());
        } else {
            const weeks = new Map();
            for (const w of list) { const k = weekStart(w.date); if (!weeks.has(k)) weeks.set(k, []); weeks.get(k).push(w); }
            for (const [ws, ws_list] of weeks) {
                const v = ws_list.reduce((a, w) => a + vol(w.sets), 0);
                body += `<div class="day-h"><span>Tuần ${fmtDM(ws)} – ${fmtDM(addDays(ws, 6))}</span><span>${ws_list.length} buổi${v ? ' · ' + fmtVol(v) : ''}</span></div>`
                    + ws_list.map((w) => wkItem(w, false)).join('');
            }
        }
        return `<section class="card flush"><div class="card-body top">${filters}</div><div class="wk-list">${body}</div></section>`;
    }
    const ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>';

    function logSide() {
        const from = ui.month + '-01', to = ui.month + '-31', list = workoutsIn(from, to);
        const prev = workoutsIn(addMonths(ui.month, -1) + '-01', addMonths(ui.month, -1) + '-31');
        const v = list.reduce((a, w) => a + vol(w.sets), 0), pv = prev.reduce((a, w) => a + vol(w.sets), 0);
        const mins = list.reduce((a, w) => a + (w.duration || 0), 0);
        // Tháng đang chạy chưa đủ ngày nên không so với tháng trước.
        const dp = (c, p) => (ui.month < curMonth() ? deltaPill(c, p, true) : '');
        const prs = list.reduce((a, w) => a + (S.pr.get(w.id) || []).length, 0);
        const sum = card(monthLabel(ui.month), 'Tóm tắt tháng', `<dl class="facts">
            <div><dt>Số buổi</dt><dd>${list.length} ${dp(list.length, prev.length)}</dd></div>
            <div><dt>Tổng set</dt><dd>${list.reduce((a, w) => a + w.sets.length, 0)}</dd></div>
            <div><dt>Khối lượng</dt><dd>${fmtVol(v)} ${dp(v, pv)}</dd></div>
            <div><dt>Thời gian tập</dt><dd>${mins ? `${Math.floor(mins / 60)} giờ ${mins % 60} phút` : '—'}</dd></div>
            <div><dt>Kỷ lục mới</dt><dd>${prs}</dd></div></dl>`);
        return sum + musclesCard(from, to, 'Nhóm cơ trong tháng', 'Số set theo nhóm cơ');
    }

    // ---------- Trang: Bài tập & kỷ lục ----------
    function exMain() {
        const all = Object.values(S.ex).sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : b.sessions - a.sessions));
        if (!all.length) {
            return `<section class="card">${emptyBox('Chưa có bài tập nào', 'Bài tập sẽ tự xuất hiện ở đây khi bạn ghi buổi tập. Mỗi lần nâng nặng hơn sẽ được tính là kỷ lục.', addBtn())}</section>`;
        }
        if (!S.ex[ui.ex]) ui.ex = all[0].name;
        const e = S.ex[ui.ex], h = e.hist, last = h[h.length - 1];
        const ago = h.filter((x) => daysBetween(x.date, todayIso()) >= 28).pop();
        const val = (x) => (e.bw ? x.top.reps : x.e1rm);
        const change = ago ? val(last) - val(ago) : null;
        const opts = all.map((x) => `<option value="${esc(x.name)}" ${x.name === e.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        const prog = `<section class="card"><div class="card-head"><div class="card-title"><span>Tiến độ</span>
                <small>${e.bw ? 'Số lần cao nhất mỗi buổi' : '1RM ước tính mỗi buổi (công thức Epley) · chấm cam là kỷ lục'}</small></div>
                <span class="spacer"></span><select class="ex-pick" data-gf="ex">${opts}</select></div>
            <div class="card-body"><div class="ex-facts">
                <div><small>Tốt nhất</small><b>${bestText(e)}</b><small>${fmtDM(e.best.date)}</small></div>
                ${e.bw ? '' : `<div><small>1RM ước tính</small><b>${one(e1rm(e.best))} kg</b><small>từ set tốt nhất</small></div>`}
                <div><small>Lần gần nhất</small><b>${setsText(e.lastSets)}</b><small>${agoText(e.last)}</small></div>
                <div><small>4 tuần qua</small><b class="${change > 0 ? 'pos' : change < 0 ? 'neg' : ''}">${change === null ? '—' : `${change >= 0 ? '+' : '−'}${one(Math.abs(change))}${e.bw ? ' lần' : ' kg'}`}</b><small>${e.sessions} buổi tổng cộng</small></div>
            </div><div class="chart" id="gEx"></div></div></section>`;
        const list = all.filter((x) => ui.exMuscle === 'all' || x.muscle === ui.exMuscle);
        const seg = `<div class="seg">${[['all', 'Tất cả']].concat(Object.entries(MUSCLES).filter(([id]) => all.some((x) => x.muscle === id)).map(([id, m]) => [id, m.name.split(' ')[0]]))
            .map(([id, l]) => `<button class="${ui.exMuscle === id ? 'on' : ''}" data-ga="ex-m" data-v="${id}">${l}</button>`).join('')}</div>`;
        const table = `<section class="card flush"><div class="card-head"><div class="card-title"><span>Tất cả bài tập</span><small>Bấm một dòng để xem tiến độ</small></div><span class="spacer"></span>${seg}</div>
            <div class="card-body"><div class="table-wrap"><table class="tbl ex-tbl"><thead><tr><th>Bài tập</th><th>Nhóm cơ</th><th class="num">Số buổi</th><th>Lần cuối</th><th class="num">Tốt nhất</th><th class="num">1RM ước tính</th></tr></thead>
            <tbody>${list.map((x) => `<tr class="${x.name === e.name ? 'sel' : ''}" data-ga="ex-pick" data-name="${esc(x.name)}">
                <td><span class="ex-name">${mdot(x.muscle)}${esc(x.name)}</span></td><td>${muscle(x.muscle).name}</td><td class="num">${x.sessions}</td>
                <td>${agoText(x.last)}</td><td class="num"><b>${bestText(x)}</b></td><td class="num">${x.bw ? '—' : one(e1rm(x.best)) + ' kg'}</td></tr>`).join('')}</tbody></table></div></div></section>`;
        return prog + table;
    }

    function calcHtml() {
        const w = parseFloat(String(ui.calcW).replace(',', '.')), r = parseInt(ui.calcR, 10);
        if (!(w > 0) || !(r > 0)) return '<p class="muted small-p">Nhập mức tạ và số lần bạn làm được để ước tính mức tạ tối đa cho 1 lần (1RM).</p>';
        const max = w * (1 + Math.min(r, 15) / 30);
        const rows = [[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [60, 15]];
        return `<p class="big">${one(max)} kg</p><table class="tbl"><thead><tr><th>% 1RM</th><th class="num">Mức tạ</th><th class="num">Khoảng số lần</th></tr></thead>
            <tbody>${rows.map(([p, n]) => `<tr><td>${p}%</td><td class="num"><b>${one((max * p) / 100)} kg</b></td><td class="num">~${n}</td></tr>`).join('')}</tbody></table>`;
    }
    function exSide() {
        const calc = `<section class="card"><div class="card-head"><div class="card-title"><span>Tính 1RM</span><small>Ước tính theo công thức Epley</small></div></div>
            <div class="card-body"><div class="row2 calc-in">
                <label class="field"><span>Mức tạ (kg)</span><input data-gf="cw" inputmode="decimal" value="${esc(ui.calcW)}" placeholder="VD: 60"></label>
                <label class="field"><span>Số lần</span><input data-gf="cr" inputmode="numeric" value="${esc(ui.calcR)}" placeholder="VD: 8"></label></div>
                <div id="gCalc">${calcHtml()}</div></div></section>`;
        return prCard(8) + calc;
    }

    // ---------- Trang: Chỉ số cơ thể ----------
    function bodyMain() {
        const b = latestBody(), b30 = bodyAt(30), st = D.settings;
        const bm = b && bmi(b.weight);
        const fat = D.body.find((x) => x.fat != null), waist = D.body.find((x) => x.waist != null);
        const d30 = b && b30 && b30.id !== b.id ? b.weight - b30.weight : null;
        const kpis = `<section class="card kpis">
            ${kpi('Cân nặng', ic('scale'), 'purple', b ? `${kg(b.weight)}<span class="cur">kg</span>` : '—', b ? agoText(b.date) : 'Chưa có số đo')}
            ${kpi('Thay đổi 30 ngày', ICON.bolt, 'blue', d30 === null ? '—' : `${d30 >= 0 ? '+' : '−'}${kg(Math.abs(d30))}<span class="cur">kg</span>`,
                d30 === null ? 'Cần số đo cách đây hơn 30 ngày' : `so với ${kg(b30.weight)} kg ngày ${fmtDM(b30.date)}`)}
            ${kpi('BMI', ICON.target, bm ? bmiLabel(bm)[1] : 'green', bm ? one(bm) : '—',
                bm ? `<span class="status ${bmiLabel(bm)[1]}">${bmiLabel(bm)[0]}</span>` : '<button class="link" data-ga="settings">Nhập chiều cao</button>')}
            ${kpi('Mỡ / vòng eo', ic('flame'), 'orange', fat ? `${one(fat.fat)}<span class="cur">%</span>` : '—', waist ? `Eo ${one(waist.waist)} cm` : 'Không bắt buộc')}
        </section>`;
        const rng = `<div class="seg">${[[30, '30 ngày'], [90, '3 tháng'], [365, '1 năm'], [0, 'Tất cả']].map(([n, l]) => `<button class="${ui.range === n ? 'on' : ''}" data-ga="range" data-n="${n}">${l}</button>`).join('')}</div>`;
        const chart = card('Cân nặng theo thời gian', st.targetWeight ? `Đường xanh là mục tiêu ${kg(st.targetWeight)} kg` : '', '<div class="chart" id="gBody"></div>', rng);
        const asc = bodyAsc(), prevOf = new Map(asc.map((x, i) => [x.id, asc[i - 1]]));
        const table = card('Lịch sử số đo', `${D.body.length} lần ghi`, D.body.length ? `<div class="table-wrap"><table class="tbl body-tbl">
            <thead><tr><th>Ngày</th><th class="num">Cân nặng</th><th class="num">Thay đổi</th><th class="num">Mỡ</th><th class="num">Vòng eo</th><th>Ghi chú</th></tr></thead>
            <tbody>${D.body.slice(0, 60).map((x) => {
                const p = prevOf.get(x.id), d = p ? x.weight - p.weight : null;
                return `<tr data-ga="body-edit" data-id="${x.id}"><td>${fmtDay(x.date)}</td><td class="num"><b>${kg(x.weight)} kg</b></td>
                    <td class="num ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d === null || Math.abs(d) < 0.05 ? '—' : `${d > 0 ? '+' : '−'}${kg(Math.abs(d))}`}</td>
                    <td class="num">${x.fat != null ? one(x.fat) + '%' : '—'}</td><td class="num">${x.waist != null ? one(x.waist) + ' cm' : '—'}</td>
                    <td class="ellipsis muted">${esc(x.note || '')}</td></tr>`;
            }).join('')}</tbody></table></div>` : emptyBox('Chưa có số đo', 'Ghi cân nặng mỗi tuần, vào cùng một giờ.', `<button class="primary-btn" data-ga="body-add">${ICON.plus}Ghi cân nặng</button>`), '', 'flush');
        return kpis + chart + table;
    }

    function bodySide() {
        const st = D.settings, b = latestBody(), asc = bodyAsc();
        let goal;
        if (!st.targetWeight) {
            goal = card('Cân nặng mục tiêu', '', `<p class="muted small-p">Đặt cân nặng muốn đạt để xem tiến độ.</p><button class="ghost-btn" data-ga="settings">${ic('gear')}Đặt mục tiêu</button>`);
        } else if (!b) {
            goal = card('Cân nặng mục tiêu', '', `<p class="big">${kg(st.targetWeight)} kg</p><p class="muted small-p">Ghi cân nặng để bắt đầu theo dõi.</p>`);
        } else {
            const start = asc[0].weight, total = st.targetWeight - start, done = b.weight - start;
            const pct = total ? Math.max(0, Math.min(100, (done / total) * 100)) : 100, left = st.targetWeight - b.weight;
            const reached = Math.abs(left) < 0.05 || (total !== 0 && Math.sign(left) !== Math.sign(total));
            const r4 = bodyAt(28), rate = r4 && r4.id !== b.id ? (b.weight - r4.weight) / (daysBetween(r4.date, b.date) / 7) : null;
            const eta = rate && !reached && Math.sign(rate) === Math.sign(left) ? Math.ceil(Math.abs(left / rate)) : null;
            goal = card('Cân nặng mục tiêu', `Bắt đầu ${kg(start)} kg · ${fmtDM(asc[0].date)}`, `
                <div class="budget-top"><div><b>${reached ? '🎉 Đã đạt mục tiêu' : `Còn ${kg(Math.abs(left))} kg`}</b><small>${left < 0 ? 'cần giảm' : left > 0 ? 'cần tăng' : ''} để đạt ${kg(st.targetWeight)} kg</small></div><b>${Math.round(pct)}%</b></div>
                <div class="meter"><i style="width:${pct}%;background:var(--c3)"></i></div>
                <dl class="facts"><div><dt>Tốc độ 4 tuần</dt><dd>${rate === null ? '—' : `${rate >= 0 ? '+' : '−'}${kg(Math.abs(rate))} kg/tuần`}</dd></div>
                <div><dt>Dự kiến đạt</dt><dd>${reached ? 'Đã đạt' : eta ? `khoảng ${eta} tuần nữa` : '—'}</dd></div></dl>`,
                `<button class="icon-btn small" data-ga="settings" title="Sửa">${ic('gear')}</button>`);
        }
        const tip = `<section class="card"><div class="card-body top"><p class="hint">${ICON.bolt}<span>Cân nặng dao động 1–2 kg mỗi ngày do nước và thức ăn. Hãy nhìn xu hướng vài tuần, không nhìn từng ngày. Giảm hoặc tăng khoảng 0,25–0,5 kg mỗi tuần là tốc độ bền vững.</span></p></div></section>`;
        return goal + tip;
    }

    // ---------- Điều hướng ----------
    function main() {
        if (!ui.month) ui.month = curMonth();
        if (!loaded) return '<section class="card empty">Đang tải…</section>';
        return { 'g:overview': overviewMain, 'g:log': logMain, 'g:ex': exMain, 'g:body': bodyMain }[view]();
    }
    function side() {
        if (!loaded) return '';
        return { 'g:overview': overviewSide, 'g:log': logSide, 'g:ex': exSide, 'g:body': bodySide }[view]();
    }
    function navBadges() {
        if (!loaded) return {};
        const t = D.settings.weekTarget || 3, wk = weekly(1)[0];
        return { 'g:overview': `${wk.count}/${t}` };
    }

    // ---------- Hộp thoại ----------
    const dlg = () => document.getElementById('finDialog');
    dlg().addEventListener('close', () => dlg().classList.remove('wide'));
    function openDialog(title, body, onOk, opts = {}) {
        const form = document.getElementById('finForm');
        dlg().classList.toggle('wide', !!opts.wide);
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
                render();
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
                render();
            } catch (err) {
                form.querySelector('.error').textContent = err.message;
            }
        };
        dlg().showModal();
        if (opts.setup) opts.setup(form);
        if (!opts.noFocus) form.querySelector('input:not([type=radio]):not([type=hidden]), select')?.focus();
    }
    const val = (form, name) => form.elements[name]?.value?.trim() ?? '';
    const numStr = (v) => (v === null || v === undefined || v === '' ? '' : String(v));

    // --- Buổi tập ---
    const libMuscle = (name) => {
        const n = name.trim().toLowerCase();
        return S.ex[Object.keys(S.ex).find((k) => k.toLowerCase() === n)]?.muscle || LIB.find(([x]) => x.toLowerCase() === n)?.[1] || null;
    };
    const knownEx = (name) => S.ex[Object.keys(S.ex).find((k) => k.toLowerCase() === name.trim().toLowerCase())];
    const setRow = (s = {}) => `<div class="gs"><span class="gs-n"></span>
        <input class="gs-w" inputmode="decimal" placeholder="kg" value="${s.weight ? kg(s.weight) : ''}" aria-label="Mức tạ (kg)"><span class="gs-x">kg ×</span>
        <input class="gs-r" inputmode="numeric" placeholder="lần" value="${s.reps || ''}" aria-label="Số lần"><span class="gs-x">lần</span>
        <button type="button" class="icon-btn" data-ge="del-set" title="Xoá set">${ic('x')}</button></div>`;
    function exBlock(g = {}) {
        const sets = g.sets && g.sets.length ? g.sets : [{}, {}, {}];
        const m = g.muscle || (g.name && libMuscle(g.name)) || 'khac';
        return `<div class="gx">
            <div class="gx-head"><input class="gx-name" list="gymExList" placeholder="Tên bài tập, VD: Bench Press" value="${esc(g.name || '')}" maxlength="60">
                <select class="gx-muscle">${Object.entries(MUSCLES).map(([id, x]) => `<option value="${id}" ${id === m ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
                <button type="button" class="icon-btn" data-ge="del-ex" title="Xoá bài tập">${ICON.trash}</button></div>
            <div class="gx-last">${lastHint(g.name)}</div>
            <div class="gx-sets">${sets.map(setRow).join('')}</div>
            <button type="button" class="link-btn gx-add" data-ge="add-set">${ICON.plus}Thêm set</button></div>`;
    }
    function lastHint(name) {
        const e = name && knownEx(name);
        if (!e) return '';
        return `Lần trước (${fmtDM(e.last)}): ${setsText(e.lastSets)} · Tốt nhất: ${bestText(e)}`;
    }
    const prefillFrom = (name) => {
        const e = knownEx(name);
        return e ? { name: e.name, muscle: e.muscle, sets: e.lastSets.map((s) => ({ weight: s.weight, reps: s.reps })) } : { name, muscle: libMuscle(name) };
    };
    function numberSets(form) {
        form.querySelectorAll('.gx').forEach((b) => b.querySelectorAll('.gs-n').forEach((n, i) => { n.textContent = i + 1; }));
    }

    function openWorkout(w, preset) {
        const x = w || preset || { date: todayIso(), title: '', duration: '', note: '', sets: [] };
        const groups = groupEx(x.sets || []);
        const titles = [...new Set(D.workouts.map((y) => y.title))].slice(0, 20);
        const exNames = [...new Set([...Object.keys(S.ex), ...LIB.map(([n]) => n)])];
        const body = `
            <div class="row2"><label class="field"><span>Tên buổi tập</span><input name="title" list="gymTitles" maxlength="60" required value="${esc(x.title)}" placeholder="VD: Push, Chân, Full body"></label>
                <label class="field"><span>Ngày</span><input name="date" type="date" value="${x.date}" required></label></div>
            <div class="quick">${Object.keys(TPL).map((t) => `<button type="button" data-gq="${esc(t)}">${esc(t)}</button>`).join('')}</div>
            <div class="row2"><label class="field"><span>Thời lượng (phút)</span><input name="duration" inputmode="numeric" value="${numStr(x.duration)}" placeholder="VD: 60"></label>
                <label class="field"><span>Ghi chú</span><input name="note" maxlength="200" value="${esc(x.note || '')}" placeholder="VD: Ngủ ít, hơi mệt"></label></div>
            <div class="sec-label">Bài tập</div>
            <div class="gx-list">${(groups.length ? groups : [{}]).map(exBlock).join('')}</div>
            <button type="button" class="ghost-btn gx-more" data-ge="add-ex">${ICON.plus}Thêm bài tập</button>
            <datalist id="gymExList">${exNames.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
            <datalist id="gymTitles">${titles.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`;
        openDialog(w ? 'Sửa buổi tập' : 'Ghi buổi tập', body, async (form) => {
            const sets = [];
            for (const b of form.querySelectorAll('.gx')) {
                const name = b.querySelector('.gx-name').value.trim();
                const rows = [...b.querySelectorAll('.gs')].map((r) => ({
                    w: r.querySelector('.gs-w').value.trim().replace(',', '.'), r: r.querySelector('.gs-r').value.trim()
                })).filter((r) => r.w || r.r);
                if (!name && !rows.length) continue;
                if (!name) throw new Error('Nhập tên cho mọi bài tập có set');
                for (const r of rows) {
                    const reps = parseInt(r.r, 10), weight = r.w ? parseFloat(r.w) : 0;
                    if (!(reps > 0)) throw new Error(`${name}: nhập số lần cho mỗi set`);
                    if (!(weight >= 0)) throw new Error(`${name}: mức tạ không hợp lệ`);
                    sets.push({ exercise: name, muscle: b.querySelector('.gx-muscle').value, reps, weight });
                }
            }
            const duration = val(form, 'duration');
            if (!sets.length && !duration) throw new Error('Thêm ít nhất một set, hoặc nhập thời lượng nếu là buổi cardio');
            await api(w ? 'PUT' : 'POST', 'gym/workouts' + (w ? '/' + w.id : ''),
                { date: val(form, 'date'), title: val(form, 'title'), duration, note: val(form, 'note'), sets });
        }, {
            wide: true,
            done: w ? '' : '💪 Đã ghi buổi tập',
            onDelete: w ? () => api('DELETE', 'gym/workouts/' + w.id) : null,
            confirmDelete: 'Xoá buổi tập này?',
            setup: (form) => {
                numberSets(form);
                form.onclick = (e) => {
                    const q = e.target.closest('[data-gq]');
                    if (q) {
                        const t = q.dataset.gq;
                        form.elements.title.value = t;
                        const filled = [...form.querySelectorAll('.gx-name')].some((i) => i.value.trim());
                        if (!filled) {
                            form.querySelector('.gx-list').innerHTML = TPL[t].map((n) => exBlock(prefillFrom(n))).join('');
                            numberSets(form);
                        }
                        return;
                    }
                    const b = e.target.closest('[data-ge]');
                    if (!b) return;
                    const blk = b.closest('.gx');
                    if (b.dataset.ge === 'add-ex') {
                        form.querySelector('.gx-list').insertAdjacentHTML('beforeend', exBlock());
                        numberSets(form);
                        form.querySelector('.gx:last-child .gx-name').focus();
                    } else if (b.dataset.ge === 'del-ex') {
                        blk.remove();
                        if (!form.querySelector('.gx')) form.querySelector('.gx-list').innerHTML = exBlock();
                        numberSets(form);
                    } else if (b.dataset.ge === 'add-set') {
                        const rows = blk.querySelectorAll('.gs'), last = rows[rows.length - 1];
                        const s = last ? { weight: parseFloat(last.querySelector('.gs-w').value.replace(',', '.')) || 0, reps: +last.querySelector('.gs-r').value || '' } : {};
                        blk.querySelector('.gx-sets').insertAdjacentHTML('beforeend', setRow(s));
                        numberSets(form);
                        blk.querySelector('.gs:last-child .gs-r').focus();
                    } else if (b.dataset.ge === 'del-set') {
                        b.closest('.gs').remove();
                        numberSets(form);
                    }
                };
                form.onchange = (e) => {
                    if (!e.target.classList.contains('gx-name')) return;
                    const blk = e.target.closest('.gx'), name = e.target.value.trim();
                    const m = libMuscle(name);
                    if (m) blk.querySelector('.gx-muscle').value = m;
                    blk.querySelector('.gx-last').innerHTML = lastHint(name);
                    const empty = [...blk.querySelectorAll('.gs input')].every((i) => !i.value.trim());
                    const k = knownEx(name);
                    if (empty && k) {
                        blk.querySelector('.gx-sets').innerHTML = k.lastSets.map((s) => setRow(s)).join('');
                        numberSets(form);
                    }
                };
            }
        });
    }
    function repeatWorkout(w) {
        openWorkout(null, { date: todayIso(), title: w.title, duration: w.duration, note: '', sets: w.sets.map((s) => ({ ...s })) });
    }

    // --- Cân nặng ---
    function openBody(b) {
        const last = latestBody();
        const x = b || { date: todayIso(), weight: last ? last.weight : '', fat: '', waist: '', note: '' };
        const body = `
            <label class="field"><span>Cân nặng (kg)</span><input name="weight" class="big-in" inputmode="decimal" required value="${x.weight ? kg(x.weight) : ''}" placeholder="VD: 65,5"></label>
            <label class="field"><span>Ngày</span><input name="date" type="date" value="${x.date}" required></label>
            <div class="row2"><label class="field"><span>Tỉ lệ mỡ (%)</span><input name="fat" inputmode="decimal" value="${x.fat != null && x.fat !== '' ? one(x.fat) : ''}" placeholder="Không bắt buộc"></label>
                <label class="field"><span>Vòng eo (cm)</span><input name="waist" inputmode="decimal" value="${x.waist != null && x.waist !== '' ? one(x.waist) : ''}" placeholder="Không bắt buộc"></label></div>
            <label class="field"><span>Ghi chú</span><input name="note" maxlength="120" value="${esc(x.note || '')}" placeholder="VD: Sáng, trước khi ăn"></label>`;
        const n = (form, k) => val(form, k).replace(',', '.');
        openDialog(b ? 'Sửa số đo' : 'Ghi cân nặng', body, async (form) => {
            await api(b ? 'PUT' : 'POST', 'gym/body' + (b ? '/' + b.id : ''),
                { date: val(form, 'date'), weight: n(form, 'weight'), fat: n(form, 'fat'), waist: n(form, 'waist'), note: val(form, 'note') });
        }, {
            done: b ? '' : '✅ Đã ghi cân nặng',
            onDelete: b ? () => api('DELETE', 'gym/body/' + b.id) : null,
            confirmDelete: 'Xoá số đo này?',
            setup: (form) => form.elements.weight.select()
        });
    }

    // --- Cài đặt ---
    function openSettings() {
        const st = D.settings;
        const body = `
            <div class="field"><span>Số buổi tập mỗi tuần</span><div class="seg wide">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<label><input type="radio" name="weekTarget" value="${n}" ${(st.weekTarget || 3) === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
            <div class="row2"><label class="field"><span>Chiều cao (cm)</span><input name="height" inputmode="decimal" value="${st.height ? one(st.height) : ''}" placeholder="Dùng để tính BMI"></label>
                <label class="field"><span>Cân nặng mục tiêu (kg)</span><input name="targetWeight" inputmode="decimal" value="${st.targetWeight ? one(st.targetWeight) : ''}" placeholder="Không bắt buộc"></label></div>`;
        const n = (form, k) => val(form, k).replace(',', '.');
        openDialog('Mục tiêu tập luyện', body, async (form) => {
            await api('PUT', 'gym/settings', { weekTarget: +form.elements.weekTarget.value, height: n(form, 'height'), targetWeight: n(form, 'targetWeight') });
        }, { done: '✅ Đã lưu mục tiêu', hint: 'Mục tiêu tuần dùng để tính chuỗi tuần tập đều.', noFocus: true });
    }

    // ---------- Sự kiện ----------
    document.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-ga]');
        if (!b || b.closest('dialog')) return;
        const a = b.dataset.ga, id = +b.dataset.id;
        const w = () => D.workouts.find((x) => x.id === id);
        e.stopPropagation();
        if (a === 'w-add') openWorkout();
        else if (a === 'w-edit') openWorkout(w());
        else if (a === 'w-repeat') repeatWorkout(w());
        else if (a === 'body-add') openBody();
        else if (a === 'body-edit') openBody(D.body.find((x) => x.id === id));
        else if (a === 'settings') openSettings();
        else if (a === 'month') { ui.month = addMonths(ui.month, +b.dataset.d); render(); }
        else if (a === 'range') { ui.range = +b.dataset.n; render(); }
        else if (a === 'ex-m') { ui.exMuscle = b.dataset.v; render(); }
        else if (a === 'ex-pick') {
            ui.ex = b.dataset.name;
            if (view !== 'g:ex') go('g:ex');
            else { render(); document.getElementById('gEx')?.closest('.card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        }
    });
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.wk[data-ga]')) { e.preventDefault(); e.target.click(); }
    });
    let qTimer;
    document.addEventListener('input', (e) => {
        const f = e.target.dataset?.gf;
        if (f === 'q') {
            clearTimeout(qTimer);
            qTimer = setTimeout(() => {
                ui.q = e.target.value;
                const pos = e.target.selectionStart;
                render();
                const again = document.querySelector('[data-gf="q"]');
                if (again) { again.focus(); again.setSelectionRange(pos, pos); }
            }, 250);
        } else if (f === 'cw' || f === 'cr') {
            ui[f === 'cw' ? 'calcW' : 'calcR'] = e.target.value;
            const out = document.getElementById('gCalc');
            if (out) out.innerHTML = calcHtml();
        }
    });
    document.addEventListener('change', (e) => {
        const f = e.target.dataset?.gf;
        if (f === 'muscle') { ui.muscle = e.target.value; render(); }
        else if (f === 'ex') { ui.ex = e.target.value; render(); }
    });
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => view.startsWith('g:') && afterRender(), 150); });

    return {
        VIEWS, load, main, side, header, afterRender, navBadges,
        isView: (v) => v in VIEWS,
        addAction: () => (view === 'g:body' ? openBody() : openWorkout())
    };
})();
