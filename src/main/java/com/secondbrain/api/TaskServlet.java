package com.secondbrain.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * GET    /api/tasks?view=today|upcoming|inbox|search|project|member[&q=..][&projectId=..][&memberId=..]
 * GET    /api/tasks/counts  — số mục tiêu chưa xong của Hôm nay và Hộp thư
 * GET    /api/tasks/stats   — số liệu bảng điều khiển (hôm nay, tuần, chuỗi ngày, gần đây)
 * POST   /api/tasks         — {title, projectId?, dueDate?, dueTime?, priority?}
 * PATCH  /api/tasks/{id}    — cập nhật một hoặc nhiều trường ở trên, hoặc {done}
 * DELETE /api/tasks/{id}
 */
@WebServlet("/api/tasks/*")
public class TaskServlet extends ApiServlet {

    /** Mục tiêu user được xem: của riêng mình trong Hộp thư, hoặc thuộc dự án mình là thành viên. */
    private static final String VISIBLE = "((t.project_id IS NULL AND t.owner_id = ?)"
            + " OR t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?))";

    private static final String SELECT = "SELECT t.*, u.name AS owner_name, u.pub_id AS owner_pub FROM tasks t"
            + " JOIN users u ON u.id = t.owner_id WHERE " + VISIBLE;

    private static final String ORDER = " ORDER BY t.done, t.due_date NULLS LAST, t.due_time NULLS LAST,"
            + " t.priority, t.id";

    private static final String TODAY = "(t.due_date = CURRENT_DATE OR (t.due_date < CURRENT_DATE AND NOT t.done))";

    @Override
    protected Object handle(Request r) throws Exception {
        try (Connection c = Db.get()) {
            if (r.is("GET", 0)) {
                return list(c, r);
            }
            if (r.is("GET", 1) && r.path[0].equals("counts")) {
                return counts(c, r.userId);
            }
            if (r.is("GET", 1) && r.path[0].equals("stats")) {
                return stats(c, r.userId);
            }
            if (r.is("POST", 0)) {
                return create(c, r);
            }
            long id = r.pathId(0);
            if (r.is("PATCH", 1)) {
                return update(c, r, id);
            }
            if (r.is("DELETE", 1)) {
                requireMine(c, r.userId, id);
                try (PreparedStatement ps = c.prepareStatement("DELETE FROM tasks WHERE id = ?")) {
                    ps.setLong(1, id);
                    ps.executeUpdate();
                }
                return Map.of("ok", true);
            }
            throw ApiException.notFound();
        }
    }

    private List<Map<String, Object>> list(Connection c, Request r) throws SQLException {
        String view = r.raw.getParameter("view");
        List<Object> params = new ArrayList<>(List.of(r.userId, r.userId));
        String where;
        switch (view == null ? "today" : view) {
            case "today":
                where = " AND " + TODAY;
                break;
            case "upcoming":
                where = " AND t.due_date > CURRENT_DATE AND NOT t.done";
                break;
            case "inbox":
                where = " AND t.project_id IS NULL";
                break;
            case "search":
                String q = r.raw.getParameter("q");
                if (q == null || q.isBlank()) {
                    return List.of();
                }
                where = " AND LOWER(t.title) LIKE ?";
                params.add("%" + q.trim().toLowerCase() + "%");
                break;
            case "member":
                // Mục tiêu của một thành viên khác — VISIBLE đảm bảo chỉ thấy phần trong dự án chung.
                where = " AND u.pub_id = ?";
                params.add(r.raw.getParameter("memberId"));
                break;
            case "project":
                where = " AND t.project_id = ?";
                params.add(parseLong(r.raw.getParameter("projectId")));
                break;
            default:
                throw ApiException.badRequest("view không hợp lệ");
        }
        List<Map<String, Object>> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(SELECT + where + ORDER)) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                out.add(toJson(rs, r.userId));
            }
        }
        return out;
    }

    private Map<String, Object> counts(Connection c, String uid) throws SQLException {
        String sql = "SELECT"
                + " COUNT(CASE WHEN " + TODAY + " AND NOT t.done THEN 1 END),"
                + " COUNT(CASE WHEN t.project_id IS NULL AND NOT t.done THEN 1 END)"
                + " FROM tasks t WHERE " + VISIBLE;
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, uid);
            ps.setString(2, uid);
            ResultSet rs = ps.executeQuery();
            rs.next();
            return Map.of("today", rs.getInt(1), "inbox", rs.getInt(2));
        }
    }

    /** Số liệu cho bảng điều khiển: tiến độ hôm nay, tuần này, chuỗi ngày và hoạt động gần đây. */
    private Map<String, Object> stats(Connection c, String uid) throws SQLException {
        Map<String, Object> out = new LinkedHashMap<>();
        String sql = "SELECT"
                + " COUNT(CASE WHEN " + TODAY + " THEN 1 END),"
                + " COUNT(CASE WHEN " + TODAY + " AND t.done THEN 1 END),"
                + " COUNT(CASE WHEN t.done AND t.done_at >= DATEADD('DAY', -6, CURRENT_DATE) THEN 1 END),"
                + " COUNT(CASE WHEN NOT t.done THEN 1 END),"
                + " COUNT(CASE WHEN NOT t.done AND t.due_date < CURRENT_DATE THEN 1 END)"
                + " FROM tasks t WHERE t.owner_id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            rs.next();
            out.put("todayTotal", rs.getInt(1));
            out.put("todayDone", rs.getInt(2));
            out.put("weekDone", rs.getInt(3));
            out.put("open", rs.getInt(4));
            out.put("overdue", rs.getInt(5));
        }

        // Chuỗi ngày liên tiếp có hoàn thành ít nhất một mục tiêu (tính đến hôm nay hoặc hôm qua).
        Set<LocalDate> days = new HashSet<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT DISTINCT CAST(done_at AS DATE) FROM tasks"
                + " WHERE owner_id = ? AND done AND done_at >= DATEADD('DAY', -366, CURRENT_DATE)")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                days.add(rs.getDate(1).toLocalDate());
            }
        }
        LocalDate d = LocalDate.now();
        if (!days.contains(d)) {
            d = d.minusDays(1);
        }
        int streak = 0;
        while (days.contains(d)) {
            streak++;
            d = d.minusDays(1);
        }
        out.put("streak", streak);

        List<Map<String, Object>> recent = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(SELECT
                + " ORDER BY COALESCE(t.done_at, t.created_at) DESC, t.id DESC LIMIT 6")) {
            ps.setString(1, uid);
            ps.setString(2, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                recent.add(toJson(rs, uid));
            }
        }
        out.put("recent", recent);
        return out;
    }

    private Map<String, Object> create(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        String title = validTitle(r.str("title"));
        Long projectId = optLong(b.get("projectId"));
        if (projectId != null && !ProjectServlet.isMember(c, r.userId, projectId)) {
            throw ApiException.forbidden();
        }
        long id;
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO tasks (title, project_id, owner_id, due_date, due_time, priority)"
                        + " VALUES (?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, title);
            ps.setObject(2, projectId);
            ps.setString(3, r.userId);
            ps.setDate(4, parseDate(r.str("dueDate")));
            ps.setTime(5, parseTime(r.str("dueTime")));
            ps.setInt(6, parsePriority(b.get("priority")));
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            id = keys.getLong(1);
        }
        return get(c, r.userId, id);
    }

    private Map<String, Object> update(Connection c, Request r, long id) throws Exception {
        requireMine(c, r.userId, id);
        JsonObject b = r.body();
        List<String> sets = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (b.has("title")) {
            sets.add("title = ?");
            params.add(validTitle(r.str("title")));
        }
        if (b.has("done")) {
            boolean done = b.get("done").getAsBoolean();
            sets.add("done = ?");
            params.add(done);
            sets.add(done ? "done_at = CURRENT_TIMESTAMP" : "done_at = NULL");
        }
        if (b.has("dueDate")) {
            sets.add("due_date = ?");
            params.add(parseDate(r.str("dueDate")));
        }
        if (b.has("dueTime")) {
            sets.add("due_time = ?");
            params.add(parseTime(r.str("dueTime")));
        }
        if (b.has("priority")) {
            sets.add("priority = ?");
            params.add(parsePriority(b.get("priority")));
        }
        if (b.has("projectId")) {
            Long projectId = optLong(b.get("projectId"));
            if (projectId != null && !ProjectServlet.isMember(c, r.userId, projectId)) {
                throw ApiException.forbidden();
            }
            sets.add("project_id = ?");
            params.add(projectId);
        }
        if (!sets.isEmpty()) {
            params.add(id);
            try (PreparedStatement ps = c.prepareStatement(
                    "UPDATE tasks SET " + String.join(", ", sets) + " WHERE id = ?")) {
                for (int i = 0; i < params.size(); i++) {
                    ps.setObject(i + 1, params.get(i));
                }
                ps.executeUpdate();
            }
        }
        return get(c, r.userId, id);
    }

    private Map<String, Object> get(Connection c, String uid, long id) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(SELECT + " AND t.id = ?")) {
            ps.setString(1, uid);
            ps.setString(2, uid);
            ps.setLong(3, id);
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                throw ApiException.notFound();
            }
            return toJson(rs, uid);
        }
    }

    /** Thành viên cùng dự án được xem mục tiêu của nhau, nhưng chỉ người tạo được sửa/xoá. */
    private void requireMine(Connection c, String uid, long id) throws SQLException {
        if (!Boolean.TRUE.equals(get(c, uid, id).get("mine"))) {
            throw new ApiException(403, "Chỉ người tạo mới được thay đổi mục tiêu này");
        }
    }

    private static Map<String, Object> toJson(ResultSet rs, String uid) throws SQLException {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("id", rs.getLong("id"));
        t.put("title", rs.getString("title"));
        long projectId = rs.getLong("project_id");
        t.put("projectId", rs.wasNull() ? null : projectId);
        Date date = rs.getDate("due_date");
        t.put("dueDate", date == null ? null : date.toString());
        Time time = rs.getTime("due_time");
        t.put("dueTime", time == null ? null : time.toString().substring(0, 5));
        t.put("priority", rs.getInt("priority"));
        t.put("done", rs.getBoolean("done"));
        t.put("ownerId", rs.getString("owner_pub"));
        t.put("ownerName", rs.getString("owner_name"));
        t.put("mine", uid.equals(rs.getString("owner_id")));
        Timestamp created = rs.getTimestamp("created_at");
        t.put("createdAt", created == null ? null : created.toLocalDateTime().toString());
        Timestamp doneAt = rs.getTimestamp("done_at");
        t.put("doneAt", doneAt == null ? null : doneAt.toLocalDateTime().toString());
        return t;
    }

    // ---------- parsing ----------

    private static String validTitle(String title) {
        if (title == null || title.isEmpty() || title.length() > 500) {
            throw ApiException.badRequest("Tên mục tiêu phải từ 1 đến 500 ký tự");
        }
        return title;
    }

    private static Long optLong(JsonElement el) {
        if (el == null || el.isJsonNull() || el.getAsString().isEmpty()) {
            return null;
        }
        return parseLong(el.getAsString());
    }

    private static long parseLong(String s) {
        try {
            return Long.parseLong(s);
        } catch (RuntimeException e) {
            throw ApiException.badRequest("Mã không hợp lệ: " + s);
        }
    }

    private static Date parseDate(String s) {
        if (s == null || s.isEmpty()) {
            return null;
        }
        try {
            return Date.valueOf(s);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Ngày không hợp lệ (yyyy-MM-dd)");
        }
    }

    private static Time parseTime(String s) {
        if (s == null || s.isEmpty()) {
            return null;
        }
        try {
            return Time.valueOf(s.length() == 5 ? s + ":00" : s);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Giờ không hợp lệ (HH:mm)");
        }
    }

    private static int parsePriority(JsonElement el) {
        if (el == null || el.isJsonNull()) {
            return 4;
        }
        int p = el.getAsInt();
        if (p < 1 || p > 4) {
            throw ApiException.badRequest("Mức ưu tiên phải từ 1 đến 4");
        }
        return p;
    }
}
