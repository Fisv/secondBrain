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
const state = { me: null, projects: [], partners: [], tasks: [], counts: {}, query: '' };
// view: 'today' | 'inbox' | 'upcoming' | 'search' | 'labels' | 'p<projectId>' | 'u:<memberId>'
let view = 'today';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();
const memberColors = ['#c0663a', '#4c8df6', '#3fb36b', '#a970ff', '#e8a33d'];
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
        [state.projects, state.counts, partners] = await Promise.all(
            [api('GET', 'projects'), api('GET', 'tasks/counts'), api('GET', 'presence')]);
        applyPartners(partners);
        if ((view.startsWith('p') && !currentProject()) || (view.startsWith('u:') && !currentMember())) view = 'today';
        await loadTasks();
        render();
    } catch (e) {
        toast(e.message);
    }
}

// ---------- Render ----------
function render() { renderSidebar(); renderMain(); }

function renderSidebar() {
    $('#userName').textContent = state.me?.name ?? '';
    $('#userAvatar').textContent = initial(state.me?.name);

    const item = (p) => `
        <a class="nav-item" data-view="p${p.id}">
            <span class="hash" style="color:${esc(p.color)}">#</span>
            <span class="ellipsis">${esc(p.name)}</span>
            <span class="count">${p.shareKey ? p.members.length + ' 👥' : p.openCount || ''}</span>
        </a>`;
    const mine = state.projects.filter((p) => !p.shareKey);
    const shared = state.projects.filter((p) => p.shareKey);
    $('#projects').innerHTML = mine.map(item).join('') || '<div class="side-empty">Chưa có dự án</div>';
    $('#shared').innerHTML = shared.map(item).join('');
    renderPartners();

    $('[data-count="today"]').textContent = state.counts.today || '';
    $('[data-count="inbox"]').textContent = state.counts.inbox || '';
}

function renderPartners() {
    // Người online lên đầu.
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

function taskHtml(t, opts = {}) {
    const p = projectById(t.projectId);
    let date = '';
    if (t.dueDate) {
        const cls = t.dueDate < todayIso() && !t.done ? 'overdue' : t.dueDate === todayIso() ? 'today' : '';
        const label = view === 'today' && t.dueDate === todayIso() ? '' : dateLabel(t.dueDate);
        date = `<span class="time ${cls}"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/></svg>${esc([label, t.dueTime].filter(Boolean).join(' ') || 'Hôm nay')}</span>`;
    }
    // Hiện người tạo khi mục tiêu thuộc dự án chung và danh sách không nhóm theo người.
    const owner = p?.shareKey && !opts.byMember
        ? `<span class="owner">${avatar(t.ownerId, t.ownerName, 'xs')}${t.mine ? 'Bạn' : esc(t.ownerName)}</span>` : '';
    const proj = p && !view.startsWith('p')
        ? `<span class="task-project">${esc(p.name)} <b style="color:${esc(p.color)}">#</b></span>` : '';
    return `
        <div class="task ${t.done ? 'done' : ''}">
            ${t.mine
                ? `<button class="check p${t.priority}" data-toggle="${t.id}" title="Đánh dấu hoàn thành"></button>`
                : `<span class="check readonly p${t.priority}" title="Mục tiêu của ${esc(t.ownerName)}"></span>`}
            <div class="task-body">
                <div class="task-title">${esc(t.title)}</div>
                ${date || owner || proj ? `<div class="task-meta">${date}${owner}${proj}</div>` : ''}
            </div>
            ${t.mine ? `<button class="icon-btn task-del" data-delete="${t.id}" title="Xoá">
                <svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>
            </button>` : ''}
        </div>`;
}

function groupHtml(title, tasks, opts = {}) {
    return `
        <section class="group">
            ${title ? `<div class="group-title">${title}</div>` : ''}
            ${tasks.map((t) => taskHtml(t, opts)).join('')}
            ${!tasks.length && opts.emptyText ? `<div class="group-empty">${opts.emptyText}</div>` : ''}
            ${opts.noAdd ? '' : `<button class="add-task" data-add-project="${opts.projectId ?? ''}" data-add-date="${opts.date ?? ''}"><span class="plus">+</span> Thêm mục tiêu</button>`}
        </section>`;
}

/** Tiêu đề nhóm cho một thành viên: avatar, tên, trạng thái, tiến độ. */
function memberTitle(m) {
    return `${avatar(m.id, m.name)}
        <span>${m.isMe ? 'Mục tiêu của tôi' : esc(m.name)}</span>
        ${m.isMe ? '' : `<small class="seen ${isOnline(m.id) ? 'on' : ''}" data-seen="${esc(m.id)}">${esc(seenText(m.id))}</small>`}
        <span class="spacer"></span>${progress(m.doneCount, m.openCount)}`;
}

function renderMain() {
    const g = $('#groups');
    const titles = { today: 'Hôm nay', inbox: 'Hộp thư', upcoming: 'Sắp tới', labels: 'Bộ lọc & Nhãn', search: 'Tìm kiếm' };
    const p = currentProject();
    const m = currentMember();
    $('#viewTitle').textContent = p ? p.name : m ? m.name : titles[view];
    $('#viewActions').innerHTML = p ? projectActions(p) : '';

    if (view === 'today') {
        const isShared = (t) => projectById(t.projectId)?.shareKey;
        const mine = state.tasks.filter((t) => !isShared(t));
        const shared = state.tasks.filter(isShared);
        g.innerHTML = groupHtml('Của tôi', mine, { date: todayIso() })
            + (shared.length ? groupHtml('Chia sẻ <span class="badge">cùng key</span>', shared, { noAdd: true }) : '');
    } else if (view === 'inbox') {
        g.innerHTML = groupHtml('', state.tasks);
    } else if (view === 'upcoming') {
        const byDate = {};
        state.tasks.forEach((t) => (byDate[t.dueDate] ??= []).push(t));
        g.innerHTML = Object.keys(byDate).map((d) => groupHtml(esc(dateLabel(d)), byDate[d], { date: d })).join('')
            || '<div class="empty">Không có mục tiêu nào sắp tới 🎉</div>'
            + groupHtml('', [], { date: isoDate(new Date(Date.now() + 86400000)) });
    } else if (view === 'search') {
        if (!$('#searchInput')) {
            g.innerHTML = `<input id="searchInput" class="search-input" placeholder="Tìm mục tiêu..." autocomplete="off"><div id="searchResults"></div>`;
            $('#searchInput').value = state.query;
            $('#searchInput').focus();
        }
        $('#searchResults').innerHTML = state.query
            ? (state.tasks.length ? groupHtml('', state.tasks, { noAdd: true }) : '<div class="empty">Không tìm thấy</div>') : '';
    } else if (p && p.shareKey) {
        // Dự án chung: mỗi thành viên một nhóm để thấy rõ mục tiêu của nhau.
        g.innerHTML = p.members.map((mem) => groupHtml(memberTitle(mem),
            state.tasks.filter((t) => t.ownerId === mem.id),
            { byMember: true, noAdd: !mem.isMe, projectId: p.id, emptyText: mem.isMe ? '' : 'Chưa có mục tiêu nào' })).join('');
    } else if (p) {
        g.innerHTML = groupHtml('', state.tasks, { projectId: p.id });
    } else if (m) {
        g.innerHTML = memberHeader(m) + memberGroups(m);
    } else {
        g.innerHTML = '<div class="empty">Tính năng đang được phát triển…</div>';
    }
}

function memberHeader(m) {
    const projects = state.projects.filter((p) => p.members.some((x) => x.id === m.id));
    return `
        <div class="member-card">
            ${avatar(m.id, m.name, 'lg')}
            <div class="member-card-info">
                <div class="seen ${isOnline(m.id) ? 'on' : ''}" data-seen="${esc(m.id)}">${esc(seenText(m.id))}</div>
                <div class="muted">Cùng ${projects.length} dự án: ${projects.map((p) => `<a data-view="p${p.id}" class="link"># ${esc(p.name)}</a>`).join(', ')}</div>
            </div>
            <div class="member-card-progress">${progress(m.doneCount, m.openCount)}</div>
        </div>`;
}

function memberGroups(m) {
    if (!state.tasks.length) return `<div class="empty">${esc(m.name)} chưa có mục tiêu nào trong các dự án chung</div>`;
    const byProject = {};
    state.tasks.forEach((t) => (byProject[t.projectId] ??= []).push(t));
    return Object.entries(byProject).map(([pid, tasks]) => {
        const p = projectById(+pid);
        return groupHtml(`<span class="hash" style="color:${esc(p?.color)}">#</span> ${esc(p?.name)}`, tasks, { byMember: true, noAdd: true });
    }).join('');
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
                <option value="4">Ưu tiên 4</option><option value="3">Ưu tiên 3</option>
                <option value="2">Ưu tiên 2</option><option value="1">Ưu tiên 1</option>
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
            // Mở lại form để nhập liên tục như Todoist.
            const again = document.querySelector(`.add-task[data-add-project="${btn.dataset.addProject}"][data-add-date="${btn.dataset.addDate}"]`);
            if (again) openAddForm(again);
        } catch (err) {
            toast(err.message);
        }
    };
    btn.replaceWith(form);
    form.querySelector('input').focus();
}

// ---------- Events ----------
document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const d = t.dataset;
    try {
        if (d.view) {
            view = d.view;
            if (view !== 'search') state.query = '';
            $('#groups').innerHTML = '';
            await loadTasks();
            render();
        } else if (d.toggle) {
            const task = state.tasks.find((x) => x.id === +d.toggle);
            await api('PATCH', 'tasks/' + task.id, { done: !task.done });
            await refresh();
        } else if (d.delete) {
            await api('DELETE', 'tasks/' + d.delete);
            await refresh();
        } else if ('addProject' in d) {
            openAddForm(t);
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
        }
    } catch (err) {
        toast(err.message);
    }
});

let searchTimer;
document.addEventListener('input', (e) => {
    if (e.target.id !== 'searchInput') return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        state.query = e.target.value;
        await loadTasks();
        renderMain();
    }, 250);
});

$('#openAdd').onclick = async () => {
    if (!['today', 'inbox'].includes(view) && !currentProject()) {
        view = 'today';
        await loadTasks();
        render();
    }
    const btn = $('.add-task');
    if (btn) openAddForm(btn);
};
$('#toggleSidebar').onclick = $('#openSidebar').onclick = () => $('#app').classList.toggle('collapsed');

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
$('#joinKey').onclick = () => {
    $('#keyInput').value = '';
    $('#keyError').textContent = '';
    keyDialog.showModal();
};
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
