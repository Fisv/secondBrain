// ---------- API ----------
async function api(method, path, body) {
    const res = await fetch('api/' + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Lỗi ' + res.status);
    return data;
}

// ---------- State ----------
const state = { me: null, projects: [], partners: [], tasks: [], counts: {}, stats: null, query: '', closed: {} };
// view: 'today' | 'inbox' | 'upcoming' | 'search' | 'labels' | 'p<projectId>' | 'u:<memberId>'
let view = 'today';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();
const memberColors = ['#3b5bfd', '#f08a24', '#22a35a', '#7c5cff', '#e5484d', '#0ea5b7'];
const colorOf = (name) => memberColors[[...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % memberColors.length];
const projectById = (id) => state.projects.find((p) => p.id === id);
const partnerById = (id) => state.partners.find((p) => p.id === id);
const currentProject = () => (view.startsWith('p') ? projectById(+view.slice(1)) : null);
const currentMember = () => (view.startsWith('u:') ? partnerById(view.slice(2)) : null);

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const todayIso = () => isoDate(new Date());

function dateLabel(iso) {
    const today = todayIso();
    const tomorrow = isoDate(new Date(Date.now() + 86400000));
    if (iso === today) return 'Hôm nay';
    if (iso === tomorrow) return 'Ngày mai';
    const d = new Date(iso + 'T00:00');
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

// ---------- Presence ----------
const isOnline = (id) => id === state.me?.id || !!partnerById(id)?.online;

function seenText(id) {
    if (isOnline(id)) return 'Đang online';
    const s = partnerById(id)?.lastSeenAgo;
    if (s == null) return 'Chưa từng online';
    if (s < 3600) return `Hoạt động ${Math.max(1, Math.round(s / 60))} phút trước`;
    if (s < 86400) return `Hoạt động ${Math.round(s / 3600)} giờ trước`;
    return `Hoạt động ${Math.round(s / 86400)} ngày trước`;
}

/** Avatar tròn kèm chấm trạng thái; data-presence giúp cập nhật chấm mà không render lại. */
function avatar(id, name, size = '') {
    return `<span class="av ${size}" style="background:${colorOf(name)}" title="${esc(name)} · ${esc(seenText(id))}">`
        + `${esc(initial(name))}<i class="dot ${isOnline(id) ? 'on' : ''}" data-presence="${esc(id)}"></i></span>`;
}

const progress = (done, open) => {
    const total = done + open;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<span class="progress" title="${done}/${total} hoàn thành"><span style="width:${pct}%"></span></span>`
        + `<span class="progress-text">${done}/${total}</span>`;
};

/** Cập nhật chấm online + dòng trạng thái tại chỗ (không làm mất form đang nhập). */
function updatePresenceDom() {
    document.querySelectorAll('[data-presence]').forEach((el) =>
        el.classList.toggle('on', isOnline(el.dataset.presence)));
    document.querySelectorAll('[data-seen]').forEach((el) => {
        el.textContent = seenText(el.dataset.seen);
        el.classList.toggle('on', isOnline(el.dataset.seen));
    });
    renderPartners();
}

function applyPartners(list) {
    // Báo khi có người vừa online (bỏ qua lần tải đầu).
    if (state.partners.length || applyPartners.loaded) {
        list.filter((p) => p.online && !partnerById(p.id)?.online)
            .forEach((p) => toast(`🟢 ${p.name} vừa online`));
    }
    applyPartners.loaded = true;
    state.partners = list;
}

async function heartbeat() {
    try {
        applyPartners(await api('POST', 'presence'));
        updatePresenceDom();
    } catch (e) { /* mất kết nối tạm thời — thử lại ở nhịp sau */ }
}

// ---------- Load ----------
async function loadTasks() {
    const p = currentProject();
    const m = currentMember();
    let query;
    if (p) query = 'view=project&projectId=' + p.id;
    else if (m) query = 'view=member&memberId=' + encodeURIComponent(m.id);
    else if (view === 'search') query = 'view=search&q=' + encodeURIComponent(state.query);
    else if (view === 'labels') return (state.tasks = []);
    else query = 'view=' + view;
    state.tasks = await api('GET', 'tasks?' + query);
}

async function refresh() {
    try {
        let partners;
        [state.projects, state.counts, partners, state.stats] = await Promise.all(
            [api('GET', 'projects'), api('GET', 'tasks/counts'), api('GET', 'presence'), api('GET', 'tasks/stats')]);
        applyPartners(partners);
        if ((view.startsWith('p') && !currentProject()) || (view.startsWith('u:') && !currentMember())) view = 'today';
        await loadTasks();
        render();
    } catch (e) {
        toast(e.message);
    }
}

async function go(v) {
    view = v;
    if (view !== 'search') {
        state.query = '';
        $('#sideSearch').value = '';
    }
    if (window.innerWidth <= 760) $('#app').classList.add('collapsed');
    await loadTasks();
    render();
    $('.main').scrollTop = 0;
}

// ---------- Icons ----------
const ICON = {
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M4 13l2.5-7.5h11L20 13v5.5H4z"/><path d="M4 13h5l1 2h4l1-2h5"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.3.5 1.8 1.6 2.9 2.7 3.4.2-2.6 1.4-4.9 3.4-6.4-.3 3 2.8 5.6 2.8 9.6 0 4.2-2.6 7.9-6 7.9z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.9-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><circle cx="17" cy="8.5" r="2.6"/><path d="M16 13.6c2.3-.2 4.1 1.3 4.6 4"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/></svg>'
};
const PRIORITY = {
    1: { label: 'Khẩn cấp', cls: 'p1' },
    2: { label: 'Quan trọng', cls: 'p2' },
    3: { label: 'Nên làm', cls: 'p3' },
    4: { label: 'Bình thường', cls: '' }
};

// ---------- Helpers cho dashboard ----------
const isOverdue = (t) => !t.done && t.dueDate && t.dueDate < todayIso();
const projectTag = (t) => {
    const p = projectById(t.projectId);
    return p ? `<span class="tag-dot" style="--c:${esc(p.color)}">${esc(p.name)}</span>`
        : '<span class="tag-dot">Hộp thư</span>';
};

function shortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.length > 10 ? iso : iso + 'T00:00');
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function greeting() {
    const h = new Date().getHours();
    return h < 11 ? 'Chào buổi sáng' : h < 13 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

/** Mục tiêu nên làm tiếp: quá hạn trước, rồi theo ưu tiên, rồi theo giờ. */
function pickNext(tasks) {
    return tasks.filter((t) => !t.done && t.mine).sort((a, b) =>
        (isOverdue(b) - isOverdue(a)) || (a.priority - b.priority)
        || String(a.dueTime || '99').localeCompare(String(b.dueTime || '99')) || a.id - b.id)[0];
}

function ring(pct, color) {
    const r = 15, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 38 38"><circle class="bg" cx="19" cy="19" r="${r}"/>`
        + `<circle cx="19" cy="19" r="${r}" stroke="${color}" stroke-linecap="round" stroke-dasharray="${(pct / 100) * c} ${c}"/></svg>`;
}

// ---------- Render ----------
function render() { renderSidebar(); renderHeader(); renderMain(); renderSide(); }

function renderSidebar() {
    $('#userName').textContent = state.me?.name ?? '';
    $('#userAvatar').textContent = initial(state.me?.name);
    $('#userAvatar').style.background = colorOf(state.me?.name);
    $('#brandSub').textContent = `${state.projects.length} dự án · ${state.stats?.open ?? 0} đang mở`;

    const item = (p) => `
        <a class="nav-item" data-view="p${p.id}">
            <span class="hash" style="background:${esc(p.color)}"></span>
            <span class="ellipsis">${esc(p.name)}</span>
            <span class="count">${p.shareKey ? p.members.length + ' 👥' : p.openCount || ''}</span>
        </a>`;
    const mine = state.projects.filter((p) => !p.shareKey);
    const shared = state.projects.filter((p) => p.shareKey);
    $('#projects').innerHTML = mine.map(item).join('') || '<div class="side-empty">Chưa có dự án</div>';
    $('#shared').innerHTML = shared.map(item).join('') || '<div class="side-empty">Chưa tham gia dự án chung</div>';
    renderPartners();

    $('[data-count="today"]').textContent = state.counts.today || '';
    $('[data-count="inbox"]').textContent = state.counts.inbox || '';

    const s = state.stats || {};
    const pct = s.todayTotal ? Math.round((s.todayDone / s.todayTotal) * 100) : 0;
    $('#goalCard').innerHTML = `
        <div class="goal-title">${ICON.target} Hoàn thành mục tiêu hôm nay</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="goal-foot"><span>${s.todayDone ?? 0} / ${s.todayTotal ?? 0} mục tiêu</span><span>${pct}%</span></div>`;
}

function renderPartners() {
    const list = [...state.partners].sort((a, b) => b.online - a.online);
    $('#partners').innerHTML = list.map((p) => `
        <a class="nav-item partner" data-view="u:${esc(p.id)}">
            ${avatar(p.id, p.name)}
            <span class="partner-info">
                <span class="ellipsis">${esc(p.name)}</span>
                <small data-seen="${esc(p.id)}" class="${p.online ? 'on' : ''}">${esc(seenText(p.id))}</small>
            </span>
            <span class="count">${p.openCount || ''}</span>
        </a>`).join('') || '<div class="side-empty">Chia sẻ một dự án để có bạn đồng hành</div>';
    const online = state.partners.filter((p) => p.online).length;
    $('#onlineCount').innerHTML = online ? `<i class="dot on inline"></i>${online}` : '';
    document.querySelectorAll('.nav-item[data-view]').forEach((el) =>
        el.classList.toggle('active', el.dataset.view === view));
}

function renderHeader() {
    const titles = { inbox: 'Hộp thư', upcoming: 'Sắp tới', labels: 'Bộ lọc & Nhãn', search: 'Tìm kiếm' };
    const p = currentProject();
    const m = currentMember();
    const s = state.stats || {};
    let title, sub;
    if (view === 'today') {
        title = `${greeting()}, ${state.me?.name ?? ''}`;
        const left = (s.todayTotal ?? 0) - (s.todayDone ?? 0);
        sub = [`Đã xong ${s.todayDone ?? 0}/${s.todayTotal ?? 0} mục tiêu hôm nay`,
            left ? `còn ${left} mục tiêu` : 'đã hoàn thành tất cả 🎉',
            s.overdue ? `${s.overdue} quá hạn` : 'đúng tiến độ'].join(' · ');
    } else if (p) {
        title = p.name;
        sub = `${p.doneCount}/${p.doneCount + p.openCount} mục tiêu hoàn thành`
            + (p.shareKey ? ` · ${p.members.length} thành viên` : ' · dự án cá nhân');
    } else if (m) {
        title = m.name;
        sub = `${seenText(m.id)} · ${m.doneCount}/${m.doneCount + m.openCount} mục tiêu trong dự án chung`;
    } else if (view === 'search') {
        title = 'Tìm kiếm';
        sub = state.query ? `${state.tasks.length} kết quả cho “${state.query}”` : 'Nhập từ khoá ở ô tìm kiếm bên trái';
    } else {
        title = titles[view];
        const open = state.tasks.filter((t) => !t.done).length;
        sub = view === 'labels' ? 'Tính năng đang được phát triển' : `${open} mục tiêu đang mở`;
    }
    $('#viewTitle').textContent = title;
    $('#viewSub').textContent = sub;
    $('#viewActions').innerHTML = p ? projectActions(p) : '';
}

// ----- Một dòng mục tiêu -----
function rowHtml(t, i, opts = {}) {
    const pr = PRIORITY[t.priority] || PRIORITY[4];
    const isNext = opts.next?.id === t.id;
    let status;
    if (t.done) status = '<span class="status green">Đã xong</span>';
    else if (isNext) status = '<span class="status blue">Đang làm</span>';
    else if (isOverdue(t)) status = `<span class="status red">Quá hạn ${esc(shortDate(t.dueDate))}</span>`;
    else if (t.dueDate && t.dueDate !== todayIso()) status = `<span class="status orange">${esc(shortDate(t.dueDate))}</span>`;
    else status = '<span class="status">Chưa bắt đầu</span>';

    const owner = projectById(t.projectId)?.shareKey && !opts.byMember
        ? `<span class="owner">${avatar(t.ownerId, t.ownerName, 'xs')}${t.mine ? 'Bạn' : esc(t.ownerName)}</span>` : '';
    const check = t.mine
        ? `<button class="num-check ${pr.cls} ${isNext ? 'next' : ''}" data-toggle="${t.id}" title="${t.done ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}">${i}</button>`
        : `<span class="num-check readonly ${pr.cls}" title="Mục tiêu của ${esc(t.ownerName)}">${i}</span>`;
    return `
        <div class="row ${t.done ? 'done' : ''}">
            ${check}
            <div class="row-title"><span class="t" title="${esc(t.title)}">${esc(t.title)}</span>${opts.noTag ? '' : projectTag(t)}${owner}</div>
            <span class="row-type">${ICON.flag}${pr.label}</span>
            <span class="row-time ${isOverdue(t) ? 'overdue' : ''}">${esc(t.dueTime || '—')}</span>
            ${status}
            ${t.mine ? `<button class="icon-btn row-del" data-delete="${t.id}" title="Xoá">${ICON.trash}</button>` : '<span></span>'}
        </div>`;
}

/** Một nhóm có thể thu gọn: pill + số lượng + mô tả bên phải. */
function stageHtml(key, head, right, rows, { open = true, footer = '' } = {}) {
    const closed = key in state.closed ? state.closed[key] : !open;
    return `
        <div class="stage ${closed ? 'closed' : ''}">
            <button class="stage-head" data-stage="${esc(key)}">${head}<span class="spacer"></span><span class="right">${right}</span>${ICON.chev}</button>
            <div class="stage-rows">${rows}${footer}</div>
        </div>`;
}

const addBtn = (projectId = '', date = '') =>
    `<button class="add-task" data-add-project="${projectId}" data-add-date="${date}"><span class="plus">+</span> Thêm mục tiêu</button>`;

function pathCard(title, count, sub, body, right = '') {
    return `
        <section class="card path" id="pathCard">
            <div class="card-head">${title}<span class="chip-n">${count}</span><span class="muted">${sub}</span>
                <span class="spacer"></span>${right}</div>
            ${body}
        </section>`;
}

function renderMain() {
    const g = $('#groups');
    const p = currentProject();
    const m = currentMember();

    if (view === 'today') {
        g.innerHTML = todayHtml();
    } else if (view === 'search') {
        g.innerHTML = !state.query
            ? '<section class="card empty"><b>Tìm mục tiêu</b>Gõ vào ô tìm kiếm ở thanh bên để tìm theo tên.</section>'
            : state.tasks.length
                ? pathCard('Kết quả', state.tasks.length, '', `<div class="stage"><div class="stage-rows">${state.tasks.map((t, i) => rowHtml(t, i + 1)).join('')}</div></div>`)
                : '<section class="card empty"><b>Không tìm thấy</b>Thử một từ khoá khác.</section>';
    } else if (view === 'inbox') {
        g.innerHTML = listCard(state.tasks, { noTag: true });
    } else if (view === 'upcoming') {
        const byDate = {};
        state.tasks.forEach((t) => (byDate[t.dueDate] ??= []).push(t));
        const tomorrow = isoDate(new Date(Date.now() + 86400000));
        const stages = Object.keys(byDate).map((d) => stageHtml('up' + d,
            `<span class="pill purple">${esc(dateLabel(d))}</span><span class="num">${byDate[d].length}</span>`, '',
            byDate[d].map((t, i) => rowHtml(t, i + 1)).join(''), { footer: addBtn('', d) })).join('');
        g.innerHTML = pathCard('Sắp tới', state.tasks.length, `${Object.keys(byDate).length} ngày có kế hoạch`,
            stages || `<div class="empty"><b>Không có mục tiêu nào sắp tới 🎉</b>Lên kế hoạch cho ngày mai nhé.</div>
                <div class="stage"><div class="stage-rows">${addBtn('', tomorrow)}</div></div>`);
    } else if (p && p.shareKey) {
        // Dự án chung: mỗi thành viên một nhóm để thấy rõ mục tiêu của nhau.
        const stages = p.members.map((mem) => {
            const tasks = state.tasks.filter((t) => t.ownerId === mem.id);
            const head = `<span class="group-member">${avatar(mem.id, mem.name)}<b class="ellipsis">${mem.isMe ? 'Mục tiêu của tôi' : esc(mem.name)}</b>
                ${mem.isMe ? '' : `<small class="seen ${isOnline(mem.id) ? 'on' : ''}" data-seen="${esc(mem.id)}">${esc(seenText(mem.id))}</small>`}</span>`;
            return stageHtml('m' + p.id + mem.id, head, progress(mem.doneCount, mem.openCount),
                tasks.map((t, i) => rowHtml(t, i + 1, { byMember: true, noTag: true })).join('')
                || `<div class="stage-empty">${mem.isMe ? 'Bạn chưa có mục tiêu nào' : 'Chưa có mục tiêu nào'}</div>`,
                { footer: mem.isMe ? addBtn(p.id) : '' });
        }).join('');
        g.innerHTML = pathCard('Thành viên', p.members.length, `${p.doneCount}/${p.doneCount + p.openCount} hoàn thành`, stages);
    } else if (p) {
        g.innerHTML = listCard(state.tasks, { noTag: true, projectId: p.id });
    } else if (m) {
        g.innerHTML = memberHeader(m) + memberGroups(m);
    } else {
        g.innerHTML = '<section class="card empty"><b>Bộ lọc & Nhãn</b>Tính năng đang được phát triển…</section>';
    }
}

/** Danh sách chia 2 nhóm: Đang làm + Đã xong. */
function listCard(tasks, opts = {}) {
    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const next = pickNext(open);
    const stages = stageHtml('open' + view, `<span class="pill purple">Đang mở</span><span class="num">${open.length}</span>`, '',
        open.map((t, i) => rowHtml(t, i + 1, { ...opts, next })).join(''), { footer: addBtn(opts.projectId ?? '', opts.date ?? '') })
        + (done.length ? stageHtml('done' + view, `<span class="pill green">Đã xong</span><span class="num">${done.length}</span>`, '',
            done.map((t, i) => rowHtml(t, i + 1, opts)).join(''), { open: false }) : '');
    return pathCard('Mục tiêu', tasks.length, `${done.length} đã xong`, stages);
}

// ----- Dashboard "Hôm nay" -----
function todayHtml() {
    const tasks = state.tasks;
    const done = tasks.filter((t) => t.done);
    const open = tasks.filter((t) => !t.done);
    const next = pickNext(open);
    const rest = open.filter((t) => t !== next);
    const s = state.stats || {};
    const pos = done.length + 1;

    let hero;
    if (next) {
        const p = projectById(next.projectId);
        const pr = PRIORITY[next.priority];
        const tip = isOverdue(next)
            ? `Mục tiêu này đã quá hạn từ ${shortDate(next.dueDate)}. Hoàn thành ngay để lấy lại nhịp độ.`
            : next.priority <= 2
                ? `Đây là mục tiêu “${pr.label.toLowerCase()}” nhất hôm nay. Xong việc này trước, các mục tiêu còn lại sẽ nhẹ nhàng hơn.`
                : s.streak
                    ? `Bạn đang có chuỗi ${s.streak} ngày liên tiếp. Hoàn thành mục tiêu này để giữ chuỗi nhé!`
                    : `Bạn đã xong ${done.length}/${tasks.length} mục tiêu hôm nay. Bắt đầu với việc này để tạo đà.`;
        hero = `
            <section class="card hero">
                <div class="hero-art">${heroArt()}</div>
                <div class="hero-body">
                    <div class="hero-top">
                        <h2>${esc(next.title)}</h2>
                        <span class="tag-outline">Tiếp theo · ${pos}/${tasks.length}</span>
                    </div>
                    <div class="meta">
                        <span>${ICON.clock}${esc(next.dueTime || 'Cả ngày')}</span>
                        <span>${p ? ICON.folder + esc(p.name) : ICON.inbox + 'Hộp thư'}</span>
                        <span class="${isOverdue(next) ? 'overdue' : ''}">${ICON.cal}${esc(dateLabel(next.dueDate || todayIso()))}</span>
                        <span>${ICON.flag}${pr.label}</span>
                    </div>
                    <div class="insight">
                        <div class="insight-label"><span class="spark"></span>Gợi ý từ Second Brain</div>
                        ${esc(tip)}
                    </div>
                    <div class="hero-foot">
                        <button class="link-btn underline" data-scroll="pathCard">Xem toàn bộ lộ trình</button>
                        <span class="spacer"></span>
                        <button class="square-btn" data-delete="${next.id}" title="Xoá mục tiêu">${ICON.trash}</button>
                        <button class="primary-btn" data-toggle="${next.id}">Hoàn thành ${ICON.arrow}</button>
                    </div>
                </div>
            </section>`;
    } else {
        hero = `
            <section class="card hero">
                <div class="hero-art">${heroArt()}</div>
                <div class="hero-body">
                    <div class="hero-top"><h2>${tasks.length ? 'Đã hoàn thành tất cả 🎉' : 'Hôm nay chưa có mục tiêu'}</h2></div>
                    <div class="insight">
                        <div class="insight-label"><span class="spark"></span>Gợi ý từ Second Brain</div>
                        ${tasks.length ? 'Tuyệt vời! Nghỉ ngơi một chút hoặc lên kế hoạch cho ngày mai.' : 'Đặt 1–3 mục tiêu nhỏ cho hôm nay để bắt đầu chuỗi ngày của bạn.'}
                    </div>
                    <div class="hero-foot"><span class="spacer"></span>
                        <button class="primary-btn" data-open-add>${ICON.plus} Thêm mục tiêu</button></div>
                </div>
            </section>`;
    }

    const sharedCount = tasks.filter((t) => projectById(t.projectId)?.shareKey).length;
    let n = 0;
    const doneRows = done.map((t) => rowHtml(t, ++n)).join('');
    const nextRow = next ? rowHtml(next, ++n, { next }) : '';
    const restRows = rest.map((t) => rowHtml(t, ++n, { next })).join('');
    const overdue = open.filter(isOverdue).length;

    const stages =
        (done.length ? stageHtml('tDone', `<span class="pill green">Đã xong</span><span class="num">${done.length}</span>`,
            `Đã hoàn thành ${Math.round((done.length / tasks.length) * 100)}%`, doneRows, { open: false }) : '')
        + (next ? stageHtml('tNext', `<span class="pill blue">Tiếp theo</span><span class="num">1</span>`,
            'Đề xuất cho bạn', nextRow) : '')
        + stageHtml('tRest', `<span class="pill purple">Sắp làm</span><span class="num">${rest.length}</span>`,
            overdue ? `${overdue} quá hạn` : rest.length ? 'Theo ưu tiên' : '',
            restRows || (next ? '' : '<div class="stage-empty">Không còn mục tiêu nào</div>'), { footer: addBtn('', todayIso()) });

    return hero + pathCard('Lộ trình hôm nay', tasks.length,
        sharedCount ? `${sharedCount} mục tiêu chia sẻ` : `${s.weekDone ?? 0} xong trong tuần`, stages,
        `<button class="link-btn" data-view="upcoming">Sắp tới ${ICON.arrow}</button>`);
}

function heroArt() {
    return `<div class="screen"><i></i><i></i><i></i>
        <svg class="curve" viewBox="0 0 200 80" preserveAspectRatio="none">
            <path d="M0 70 C 30 70, 40 40, 70 45 S 110 60, 130 30 S 170 10, 200 12" stroke="var(--accent)"/>
            <circle cx="186" cy="12" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>
        </svg></div>`;
}

// ----- Cột phải -----
function renderSide() {
    const s = state.stats || {};
    const online = state.partners.filter((p) => p.online);
    const partnersCard = state.partners.length
        ? `<button class="notice" data-view="u:${esc((online[0] || state.partners[0]).id)}">
                <span class="notice-icon">${ICON.users}</span>
                <span class="notice-text"><b>${online.length ? `${online.length} bạn đồng hành đang online` : 'Bạn đồng hành'}</b>
                    <small>${esc(state.partners.slice(0, 3).map((p) => p.name).join(', '))}${state.partners.length > 3 ? '…' : ''}</small></span>
                <span class="stack">${state.partners.slice(0, 3).map((p) => avatar(p.id, p.name)).join('')}</span>
           </button>`
        : `<button class="notice" id="joinKey3">
                <span class="notice-icon">${ICON.key}</span>
                <span class="notice-text"><b>Cùng tiến bộ với bạn bè</b><small>Tham gia dự án chung bằng key</small></span>
                ${ICON.arrow}
           </button>`;

    const projects = [...state.projects]
        .map((p) => ({ p, total: p.openCount + p.doneCount, pct: p.openCount + p.doneCount ? Math.round((p.doneCount / (p.openCount + p.doneCount)) * 100) : 0 }))
        .filter((x) => x.total)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 4);
    const level = (pct) => pct < 34 ? ['red', 'Cần tập trung', 'var(--red)'] : pct < 67 ? ['orange', 'Đang tiến', 'var(--orange)'] : ['green', 'Tốt', 'var(--green)'];
    const rings = projects.map(({ p, pct }) => {
        const [cls, label, color] = level(pct);
        return `<button class="ring-row" data-view="p${p.id}">${ring(pct, color)}
            <span class="ring-info"><span class="ellipsis">${esc(p.name)}</span><b>${pct}%</b></span>
            <span class="badge ${cls}">${label}</span></button>`;
    }).join('') || '<div class="empty">Tạo dự án và thêm mục tiêu để theo dõi tiến độ</div>';

    const recent = (s.recent || []).map((t) => {
        const p = projectById(t.projectId);
        const doneItem = t.done;
        return `<div class="tl">
            <span class="tl-icon ${doneItem ? 'done' : 'add'}">${doneItem ? ICON.check : ICON.plus}</span>
            <span class="tl-body"><b>${doneItem ? 'Hoàn thành' : 'Thêm'}: ${esc(t.title)}</b>
                <small>${esc(p ? p.name : 'Hộp thư')} · ${t.mine ? 'Bạn' : esc(t.ownerName)}</small></span>
            <span class="tl-date">${esc(shortDate(doneItem ? t.doneAt : t.createdAt))}</span>
        </div>`;
    }).join('') || '<div class="empty">Chưa có hoạt động nào</div>';

    $('#side').innerHTML = `
        <section class="card stats">
            <div class="stat"><span class="stat-icon blue">${ICON.target}</span><small>Hôm nay</small><b>${s.todayDone ?? 0}/${s.todayTotal ?? 0}</b></div>
            <div class="stat"><span class="stat-icon green">${ICON.bolt}</span><small>Tuần này</small><b>${s.weekDone ?? 0} xong</b></div>
            <div class="stat"><span class="stat-icon orange">${ICON.fire}</span><small>Chuỗi</small><b>${s.streak ?? 0} ngày</b></div>
        </section>
        <section class="card">${partnersCard}</section>
        <section class="card">
            <div class="card-head">Tiến độ dự án <span class="chip-n grey">${state.projects.length}</span>
                <span class="spacer"></span><span class="goal-chip">Mục tiêu: 80%</span></div>
            ${rings}
        </section>
        <section class="card">
            <div class="card-head">Hoạt động gần đây<span class="spacer"></span>
                <span class="muted">${s.open ?? 0} đang mở</span></div>
            <div class="timeline">${recent}</div>
        </section>`;
}

function memberHeader(m) {
    const projects = state.projects.filter((p) => p.members.some((x) => x.id === m.id));
    return `
        <section class="card member-card">
            ${avatar(m.id, m.name, 'lg')}
            <div class="member-card-info">
                <b>${esc(m.name)}</b>
                <div class="seen ${isOnline(m.id) ? 'on' : ''}" data-seen="${esc(m.id)}">${esc(seenText(m.id))}</div>
                <div class="muted">Cùng ${projects.length} dự án: ${projects.map((p) => `<a data-view="p${p.id}" class="link">${esc(p.name)}</a>`).join(', ')}</div>
            </div>
            <div class="member-card-progress">${progress(m.doneCount, m.openCount)}</div>
        </section>`;
}

function memberGroups(m) {
    if (!state.tasks.length) return `<section class="card empty">${esc(m.name)} chưa có mục tiêu nào trong các dự án chung</section>`;
    const byProject = {};
    state.tasks.forEach((t) => (byProject[t.projectId] ??= []).push(t));
    const stages = Object.entries(byProject).map(([pid, tasks]) => {
        const p = projectById(+pid);
        return stageHtml('u' + m.id + pid, `<span class="hash" style="background:${esc(p?.color)}"></span><b>${esc(p?.name)}</b><span class="num">${tasks.length}</span>`,
            '', tasks.map((t, i) => rowHtml(t, i + 1, { byMember: true, noTag: true })).join(''));
    }).join('');
    return pathCard('Mục tiêu', state.tasks.length, `trong ${Object.keys(byProject).length} dự án chung`, stages);
}

function projectActions(p) {
    const key = p.shareKey
        ? `<button class="key-chip" data-copy="${esc(p.shareKey)}" title="Sao chép key">🔑 ${esc(p.shareKey)}</button>`
            + `<button class="ghost-btn" data-invite="${esc(p.shareKey)}" title="Sao chép link mời">🔗 Link mời</button>`
        : '';
    const share = p.isOwner
        ? (p.shareKey
            ? `<button class="ghost-btn" data-unshare="${p.id}">Ngừng chia sẻ</button>`
            : `<button class="ghost-btn" data-share="${p.id}">Chia sẻ</button>`)
        : '';
    const remove = `<button class="ghost-btn danger" data-remove="${p.id}">${p.isOwner ? 'Xoá dự án' : 'Rời dự án'}</button>`;
    return key + share + remove;
}

// ---------- Add-task form ----------
function openAddForm(btn) {
    document.querySelectorAll('.inline-form').forEach((f) => f.cancel());
    const projectId = btn.dataset.addProject;
    const form = document.createElement('form');
    form.className = 'inline-form';
    form.innerHTML = `
        <input name="title" placeholder="Tên mục tiêu..." required maxlength="500" autocomplete="off">
        <div class="form-row">
            <input name="dueDate" type="date" value="${btn.dataset.addDate}">
            <input name="dueTime" type="time">
            <select name="priority">
                ${[4, 3, 2, 1].map((n) => `<option value="${n}">${PRIORITY[n].label}</option>`).join('')}
            </select>
            <select name="projectId">
                <option value="">📥 Hộp thư</option>
                ${state.projects.map((p) => `<option value="${p.id}" ${String(p.id) === projectId ? 'selected' : ''}># ${esc(p.name)}</option>`).join('')}
            </select>
            <span class="spacer"></span>
            <button type="button" class="ghost-btn" data-cancel>Huỷ</button>
            <button class="primary-btn">Thêm</button>
        </div>`;
    form.cancel = () => form.replaceWith(btn);
    form.querySelector('[data-cancel]').onclick = form.cancel;
    form.onkeydown = (e) => e.key === 'Escape' && form.cancel();
    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.priority = +data.priority;
        try {
            await api('POST', 'tasks', data);
            await refresh();
            // Mở lại form để nhập liên tục.
            const again = document.querySelector(`.add-task[data-add-project="${btn.dataset.addProject}"][data-add-date="${btn.dataset.addDate}"]`);
            if (again) openAddForm(again);
        } catch (err) {
            toast(err.message);
        }
    };
    btn.replaceWith(form);
    // Mở nhóm chứa form nếu đang thu gọn.
    form.closest('.stage')?.classList.remove('closed');
    form.querySelector('input').focus();
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function openAddAnywhere() {
    if (!['today', 'inbox', 'upcoming'].includes(view) && !currentProject()) await go('today');
    const btn = $('.add-task');
    if (btn) openAddForm(btn);
}

// ---------- Events ----------
document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const d = t.dataset;
    try {
        if (d.view) {
            await go(d.view);
        } else if (d.toggle) {
            const task = state.tasks.find((x) => x.id === +d.toggle);
            await api('PATCH', 'tasks/' + d.toggle, { done: !task?.done });
            if (task && !task.done) toast('✅ Đã hoàn thành “' + task.title + '”');
            await refresh();
        } else if (d.delete) {
            const task = state.tasks.find((x) => x.id === +d.delete);
            if (task && !confirm(`Xoá mục tiêu “${task.title}”?`)) return;
            await api('DELETE', 'tasks/' + d.delete);
            await refresh();
        } else if ('addProject' in d) {
            openAddForm(t);
        } else if ('openAdd' in d) {
            openAddAnywhere();
        } else if (d.stage) {
            const stage = t.closest('.stage');
            stage.classList.toggle('closed');
            state.closed[d.stage] = stage.classList.contains('closed');
        } else if (d.scroll) {
            document.getElementById(d.scroll)?.scrollIntoView({ behavior: 'smooth' });
        } else if (d.share) {
            await api('POST', `projects/${d.share}/share`);
            await refresh();
            toast('Đã tạo key — bấm vào key để sao chép');
        } else if (d.unshare) {
            if (!confirm('Ngừng chia sẻ sẽ thu hồi key và xoá các thành viên khác. Tiếp tục?')) return;
            await api('DELETE', `projects/${d.unshare}/share`);
            await refresh();
        } else if (d.remove) {
            const p = projectById(+d.remove);
            const msg = p.isOwner ? `Xoá dự án "${p.name}" và toàn bộ mục tiêu bên trong?` : `Rời dự án "${p.name}"?`;
            if (!confirm(msg)) return;
            await api('DELETE', 'projects/' + d.remove);
            view = 'today';
            await refresh();
        } else if (d.invite) {
            await navigator.clipboard.writeText(inviteUrl(d.invite));
            toast(isLocalhost()
                ? 'Đã sao chép link — lưu ý link đang dùng localhost, người khác cần mở bằng địa chỉ IP của máy bạn'
                : 'Đã sao chép link mời');
        } else if (d.copy) {
            await navigator.clipboard.writeText(d.copy);
            toast('Đã sao chép key ' + d.copy);
        } else if (d.collapse) {
            t.classList.toggle('closed');
            document.getElementById(d.collapse).classList.toggle('hidden');
        } else if (t.id === 'joinKey3') {
            openKeyDialog();
        }
    } catch (err) {
        toast(err.message);
    }
});

let searchTimer;
$('#sideSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        state.query = e.target.value.trim();
        if (!state.query && view === 'search') return go('today');
        view = 'search';
        await loadTasks();
        renderSidebar();
        renderHeader();
        renderMain();
    }, 250);
});
$('#sideSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.target.value = ''; go('today'); }
});

$('#openAdd').onclick = openAddAnywhere;
$('#openSidebar').onclick = () => $('#app').classList.toggle('collapsed');
if (window.innerWidth <= 760) $('#app').classList.add('collapsed');

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    $('#themeLabel').textContent = theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối';
}
applyTheme(document.documentElement.dataset.theme);
$('#themeToggle').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

$('#userBtn').onclick = async () => {
    const name = prompt('Tên hiển thị của bạn (người cùng key sẽ thấy tên này):', state.me.name);
    if (!name || !name.trim()) return;
    try {
        state.me = await api('PUT', 'me', { name: name.trim() });
        await refresh();
    } catch (err) {
        toast(err.message);
    }
};

// Dialog dùng chung: chỉ đóng khi thao tác thành công.
function setupDialog(dialog, onOk) {
    dialog.querySelector('form').addEventListener('submit', async (e) => {
        if (e.submitter?.value !== 'ok') return;
        e.preventDefault();
        try {
            await onOk();
            dialog.close();
        } catch (err) {
            const box = dialog.querySelector('.error');
            if (box) box.textContent = err.message; else toast(err.message);
        }
    });
}

const keyDialog = $('#keyDialog');
function openKeyDialog() {
    $('#keyInput').value = '';
    $('#keyError').textContent = '';
    keyDialog.showModal();
}
$('#joinKey').onclick = $('#joinKey2').onclick = openKeyDialog;
setupDialog(keyDialog, async () => {
    const p = await api('POST', 'projects/join', { key: $('#keyInput').value.trim() });
    view = 'p' + p.id;
    await refresh();
    toast('Đã tham gia "' + p.name + '"');
});

const projectDialog = $('#projectDialog');
$('#newProject').onclick = () => {
    $('#projectName').value = '';
    projectDialog.showModal();
};
setupDialog(projectDialog, async () => {
    const p = await api('POST', 'projects', { name: $('#projectName').value.trim(), color: $('#projectColor').value });
    view = 'p' + p.id;
    await refresh();
});

// ---------- Link mời: ?join=SB-XXXX-XXXX ----------
const isLocalhost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const inviteUrl = (key) => location.origin + location.pathname + '?join=' + encodeURIComponent(key);

const inviteDialog = $('#inviteDialog');
let inviteKey = null;

async function handleInviteLink() {
    const params = new URLSearchParams(location.search);
    inviteKey = params.get('join');
    if (!inviteKey) return;
    // Xoá ?join khỏi thanh địa chỉ để F5 không hỏi lại.
    params.delete('join');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : ''));
    try {
        const inv = await api('GET', 'projects/invite?key=' + encodeURIComponent(inviteKey));
        if (inv.joined) {
            view = 'p' + inv.id;
            await refresh();
            return toast(`Bạn đã là thành viên của "${inv.name}"`);
        }
        $('#inviteIcon').style.color = inv.color;
        $('#inviteTitle').textContent = inv.name;
        $('#inviteInfo').textContent = `${inv.ownerName} mời bạn cùng theo dõi mục tiêu · ${inv.memberCount} thành viên`;
        // Người mới chưa đặt tên: hỏi luôn để người kia biết ai vừa tham gia.
        const needName = !state.me || state.me.name === 'Bạn';
        $('#inviteNameField').hidden = !needName;
        $('#inviteName').value = '';
        $('#inviteName').required = needName;
        $('#inviteError').textContent = '';
        inviteDialog.showModal();
    } catch (e) {
        toast(e.message);
    }
}

setupDialog(inviteDialog, async () => {
    if (!$('#inviteNameField').hidden) {
        state.me = await api('PUT', 'me', { name: $('#inviteName').value.trim() });
    }
    const p = await api('POST', 'projects/join', { key: inviteKey });
    view = 'p' + p.id;
    await refresh();
    toast(`🎉 Đã tham gia "${p.name}"`);
});

// Đồng bộ mục tiêu của người cùng key mỗi 10 giây (bỏ qua khi đang nhập).
setInterval(() => {
    if (!document.hidden && !document.querySelector('.inline-form, dialog[open]') && view !== 'search') refresh();
}, 10000);

// Heartbeat để người khác thấy mình online; chạy cả khi đang nhập.
setInterval(heartbeat, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
// Đóng tab → báo offline ngay thay vì đợi hết hạn.
window.addEventListener('pagehide', () => navigator.sendBeacon('api/presence/offline'));

(async () => {
    try {
        state.me = await api('GET', 'me');
    } catch (e) {
        toast('Không kết nối được máy chủ: ' + e.message);
    }
    await refresh();
    handleInviteLink();
})();
