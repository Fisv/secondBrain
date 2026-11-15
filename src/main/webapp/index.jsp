<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Second Brain</title>
    <script>document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light';</script>
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
<div class="app" id="app">

    <!-- ===== Sidebar ===== -->
    <aside class="sidebar">
        <button class="brand" id="brandBtn" data-view="today">
            <span class="brand-logo">
                <svg viewBox="0 0 24 24"><path d="M12 4.5c-2.2-1.6-5.5-1.4-7 .5v13.5c1.5-1.6 4.8-1.8 7-.2 2.2-1.6 5.5-1.4 7 .2V5c-1.5-1.9-4.8-2.1-7-.5z"/><path d="M12 4.5v13.8"/></svg>
            </span>
            <span class="brand-text">
                <b>Second Brain</b>
                <small id="brandSub">Mục tiêu của tôi</small>
            </span>
        </button>

        <label class="side-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>
            <input id="sideSearch" placeholder="Tìm mục tiêu, dự án..." autocomplete="off">
        </label>

        <div class="side-scroll">
            <div class="side-label">Không gian</div>
            <nav class="nav">
                <a class="nav-item active" data-view="today">
                    <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>
                    Hôm nay <span class="count pill" data-count="today"></span>
                </a>
                <a class="nav-item" data-view="inbox">
                    <svg viewBox="0 0 24 24"><path d="M4 13l2.5-7.5h11L20 13v5.5H4z"/><path d="M4 13h5l1 2h4l1-2h5"/></svg>
                    Hộp thư <span class="count pill" data-count="inbox"></span>
                </a>
                <a class="nav-item" data-view="upcoming">
                    <svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/></svg>
                    Sắp tới
                </a>
                <a class="nav-item" data-view="labels">
                    <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>
                    Bộ lọc &amp; Nhãn
                </a>
            </nav>

            <div class="section">
                <button class="section-head" data-collapse="finance">
                    <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Tài chính
                </button>
                <div class="section-body" id="finance">
                    <a class="nav-item" data-view="f:overview">
                        <svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h11v4"/><rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="16" cy="13" r="1"/></svg>
                        Tổng quan
                    </a>
                    <a class="nav-item" data-view="f:tx">
                        <svg viewBox="0 0 24 24"><path d="M5 8h13l-3-3M19 16H6l3 3"/></svg> Giao dịch
                    </a>
                    <a class="nav-item" data-view="f:sources">
                        <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16"/></svg>
                        Nguồn thu nhập <span class="count pill warn" data-fin-badge="f:sources"></span>
                    </a>
                    <a class="nav-item" data-view="f:forecast">
                        <svg viewBox="0 0 24 24"><path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/></svg> Ước tính thu nhập
                    </a>
                    <a class="nav-item" data-view="f:goals">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/></svg>
                        Mục tiêu tài chính <span class="count pill warn" data-fin-badge="f:goals"></span>
                    </a>
                </div>
            </div>

            <div class="section">
                <div class="section-row">
                    <button class="section-head" data-collapse="projects">
                        <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Dự án của tôi
                    </button>
                    <button class="icon-btn small" id="newProject" title="Tạo dự án">
                        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                </div>
                <div class="section-body" id="projects"></div>
            </div>

            <div class="section">
                <div class="section-row">
                    <button class="section-head" data-collapse="shared">
                        <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Chia sẻ
                    </button>
                    <button class="icon-btn small" id="joinKey" title="Tham gia bằng key">
                        <svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/></svg>
                    </button>
                </div>
                <div class="section-body" id="shared"></div>
            </div>

            <div class="section">
                <button class="section-head" data-collapse="partners">
                    <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Bạn đồng hành
                    <span class="count" id="onlineCount"></span>
                </button>
                <div class="section-body" id="partners"></div>
            </div>
        </div>

        <div class="side-bottom">
            <div class="goal-card" id="goalCard"></div>
            <button class="nav-item" id="themeToggle">
                <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>
                <span id="themeLabel">Chế độ tối</span>
            </button>
            <button class="nav-item" id="joinKey2">
                <svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/></svg>
                Tham gia bằng key
            </button>
            <button class="profile" id="userBtn" title="Đổi tên hiển thị">
                <span class="av md" id="userAvatar">?</span>
                <span class="profile-info">
                    <b id="userName">...</b>
                    <small>Đổi tên hiển thị</small>
                </span>
                <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>
            </button>
        </div>
    </aside>

    <!-- ===== Main ===== -->
    <main class="main">
        <header class="main-head">
            <button class="icon-btn" id="openSidebar" title="Thanh bên">
                <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/></svg>
            </button>
            <div class="greeting">
                <h1 id="viewTitle">Xin chào</h1>
                <p id="viewSub"></p>
            </div>
            <div class="view-actions" id="viewActions"></div>
            <button class="ask-btn" id="openAdd">
                <span class="ask-icon"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></span>
                <span id="addLabel">Thêm mục tiêu</span>
            </button>
        </header>

        <div class="board">
            <div class="board-main" id="groups"></div>
            <aside class="board-side" id="side"></aside>
        </div>
    </main>
</div>

<!-- ===== Join-by-key dialog ===== -->
<dialog id="keyDialog" class="dialog">
    <form method="dialog">
        <h3>Tham gia mục tiêu chung</h3>
        <p class="hint">Nhập key được chia sẻ để cùng theo dõi mục tiêu với người khác.</p>
        <input id="keyInput" class="mono" placeholder="VD: SB-7F3K-92QX" autocomplete="off">
        <p class="error" id="keyError"></p>
        <div class="dialog-actions">
            <button value="cancel" class="ghost-btn" formnovalidate>Huỷ</button>
            <button value="ok" class="primary-btn">Tham gia</button>
        </div>
    </form>
</dialog>

<!-- ===== New project dialog ===== -->
<dialog id="projectDialog" class="dialog">
    <form method="dialog">
        <h3>Tạo dự án</h3>
        <p class="hint">Dự án giúp nhóm các mục tiêu. Bạn có thể chia sẻ bằng key sau khi tạo.</p>
        <div class="row">
            <input id="projectColor" type="color" value="#3b5bfd">
            <input id="projectName" placeholder="Tên dự án" autocomplete="off" maxlength="200">
        </div>
        <div class="dialog-actions">
            <button value="cancel" class="ghost-btn" formnovalidate>Huỷ</button>
            <button value="ok" class="primary-btn">Tạo</button>
        </div>
    </form>
</dialog>

<!-- ===== Invite-link dialog ===== -->
<dialog id="inviteDialog" class="dialog invite">
    <form method="dialog">
        <div class="invite-icon" id="inviteIcon">#</div>
        <h3 id="inviteTitle">Lời mời tham gia</h3>
        <p class="hint" id="inviteInfo"></p>
        <label class="field" id="inviteNameField">
            <span>Tên hiển thị của bạn</span>
            <input id="inviteName" placeholder="VD: Phong" maxlength="100" autocomplete="off">
        </label>
        <p class="error" id="inviteError"></p>
        <div class="dialog-actions">
            <button value="cancel" class="ghost-btn" formnovalidate>Để sau</button>
            <button value="ok" class="primary-btn">Tham gia</button>
        </div>
    </form>
</dialog>

<!-- ===== Dialog tài chính (nội dung do finance.js dựng) ===== -->
<dialog id="finDialog" class="dialog fin-dlg">
    <form method="dialog" id="finForm"></form>
</dialog>

<div class="toast" id="toast"></div>

<script src="assets/js/finance.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
