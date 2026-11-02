<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Second Brain</title>
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
<div class="app" id="app">

    <!-- ===== Sidebar ===== -->
    <aside class="sidebar">
        <div class="sidebar-top">
            <button class="user" id="userBtn" title="Đổi tên hiển thị">
                <span class="avatar" id="userAvatar">?</span>
                <span class="user-name" id="userName">...</span>
                <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>
            </button>
            <div class="top-actions">
                <button class="icon-btn" title="Thông báo">
                    <svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
                </button>
                <button class="icon-btn" id="toggleSidebar" title="Thu gọn">
                    <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/></svg>
                </button>
            </div>
        </div>

        <nav class="nav">
            <button class="nav-item add" id="openAdd">
                <span class="plus-circle">+</span> Thêm mục tiêu
            </button>
            <a class="nav-item" data-view="search">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg> Tìm kiếm
            </a>
            <a class="nav-item" data-view="inbox">
                <svg viewBox="0 0 24 24"><path d="M4 13l2.5-7.5h11L20 13v5.5H4z"/><path d="M4 13h5l1 2h4l1-2h5"/></svg> Hộp thư
                <span class="count" data-count="inbox"></span>
            </a>
            <a class="nav-item active" data-view="today">
                <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg> Hôm nay
                <span class="count" data-count="today"></span>
            </a>
            <a class="nav-item" data-view="upcoming">
                <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 14h2M12 14h2M16 14h0"/></svg> Sắp tới
            </a>
            <a class="nav-item" data-view="labels">
                <svg viewBox="0 0 24 24"><path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.2"/></svg> Bộ lọc &amp; Nhãn
            </a>
        </nav>

        <div class="section">
            <div class="section-row">
                <button class="section-head" data-collapse="projects">
                    <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Dự án của tôi
                </button>
                <button class="icon-btn small" id="newProject" title="Tạo dự án">+</button>
            </div>
            <div class="section-body" id="projects"></div>
        </div>

        <div class="section">
            <button class="section-head" data-collapse="shared">
                <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Chia sẻ
            </button>
            <div class="section-body" id="shared"></div>
            <button class="nav-item muted" id="joinKey">
                <svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/></svg> Tham gia bằng key
            </button>
        </div>

        <div class="section">
            <button class="section-head" data-collapse="partners">
                <svg class="chev" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg> Bạn đồng hành
                <span class="count" id="onlineCount"></span>
            </button>
            <div class="section-body" id="partners"></div>
        </div>
    </aside>

    <!-- ===== Main ===== -->
    <main class="main">
        <div class="main-top">
            <button class="icon-btn" id="openSidebar" title="Mở thanh bên">
                <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/></svg>
            </button>
            <button class="ghost-btn">
                <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 9h7M8.5 12h7M8.5 15h7"/></svg> Hiển thị
            </button>
        </div>
        <div class="content">
            <div class="view-head">
                <h1 id="viewTitle">Hôm nay</h1>
                <div class="view-actions" id="viewActions"></div>
            </div>
            <div id="groups"></div>
        </div>
    </main>
</div>

<!-- ===== Join-by-key dialog ===== -->
<dialog id="keyDialog" class="dialog">
    <form method="dialog">
        <h3>Tham gia mục tiêu chung</h3>
        <p class="hint">Nhập key được chia sẻ để cùng theo dõi mục tiêu với người khác.</p>
        <input id="keyInput" placeholder="VD: SB-7F3K-92QX" autocomplete="off">
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
            <input id="projectColor" type="color" value="#e0534f">
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

<div class="toast" id="toast"></div>

<script src="assets/js/app.js"></script>
</body>
</html>
