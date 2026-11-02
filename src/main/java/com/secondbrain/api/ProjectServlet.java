package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * GET    /api/projects              — danh sách dự án user là thành viên
 * POST   /api/projects              — tạo dự án {name, color}
 * PATCH  /api/projects/{id}         — đổi tên/màu (chủ dự án)
 * DELETE /api/projects/{id}         — chủ: xoá dự án; thành viên: rời dự án
 * POST   /api/projects/{id}/share   — tạo key chia sẻ (chủ dự án)
 * DELETE /api/projects/{id}/share   — ngừng chia sẻ, xoá các thành viên khác (chủ dự án)
 * POST   /api/projects/join         — tham gia bằng key {key}
 * GET    /api/projects/invite?key=  — xem trước dự án của link mời (chưa tham gia)
 */
@WebServlet("/api/projects/*")
public class ProjectServlet extends ApiServlet {

    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final String KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    protected Object handle(Request r) throws Exception {
        try (Connection c = Db.get()) {
            if (r.is("GET", 0)) {
                return list(c, r.userId);
            }
            if (r.is("POST", 0)) {
                return create(c, r);
            }
            if (r.is("GET", 1) && r.path[0].equals("invite")) {
                return invite(c, r.userId, r.raw.getParameter("key"));
            }
            if (r.is("POST", 1) && r.path[0].equals("join")) {
                return join(c, r);
            }
            long id = r.pathId(0);
            if (r.is("PATCH", 1)) {
                return update(c, r, id);
            }
            if (r.is("DELETE", 1)) {
                return delete(c, r.userId, id);
            }
            if (r.path.length == 2 && r.path[1].equals("share")) {
                if (r.method.equals("POST")) {
                    return share(c, r.userId, id);
                }
                if (r.method.equals("DELETE")) {
                    return unshare(c, r.userId, id);
                }
            }
            throw ApiException.notFound();
        }
    }

    private List<Map<String, Object>> list(Connection c, String uid) throws SQLException {
        String sql = "SELECT p.*, (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND NOT t.done) AS open_count"
                + " FROM projects p JOIN project_members m ON m.project_id = p.id"
                + " WHERE m.user_id = ? ORDER BY p.created_at, p.id";
        List<Map<String, Object>> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                out.add(toJson(c, rs, uid));
            }
        }
        return out;
    }

    private Map<String, Object> get(Connection c, String uid, long id) throws SQLException {
        String sql = "SELECT p.*, (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND NOT t.done) AS open_count"
                + " FROM projects p WHERE p.id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                throw ApiException.notFound();
            }
            return toJson(c, rs, uid);
        }
    }

    private Map<String, Object> toJson(Connection c, ResultSet rs, String uid) throws SQLException {
        long id = rs.getLong("id");
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", id);
        p.put("name", rs.getString("name"));
        p.put("color", rs.getString("color"));
        p.put("shareKey", rs.getString("share_key"));
        p.put("isOwner", uid.equals(rs.getString("owner_id")));
        p.put("openCount", rs.getInt("open_count"));
        // Thành viên: chính mình đứng đầu, kèm số mục tiêu mỗi người tạo trong dự án.
        List<Map<String, Object>> members = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT u.id, u.pub_id, u.name,"
                        + " (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.owner_id = u.id AND NOT t.done) AS open_count,"
                        + " (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.owner_id = u.id AND t.done) AS done_count"
                        + " FROM project_members m JOIN users u ON u.id = m.user_id"
                        + " WHERE m.project_id = ? ORDER BY CASE WHEN u.id = ? THEN 0 ELSE 1 END, u.name")) {
            ps.setLong(1, id);
            ps.setString(2, uid);
            ResultSet m = ps.executeQuery();
            while (m.next()) {
                Map<String, Object> member = new LinkedHashMap<>();
                member.put("id", m.getString("pub_id"));
                member.put("name", m.getString("name"));
                member.put("isMe", uid.equals(m.getString("id")));
                member.put("openCount", m.getInt("open_count"));
                member.put("doneCount", m.getInt("done_count"));
                members.add(member);
            }
        }
        p.put("members", members);
        return p;
    }

    private Object create(Connection c, Request r) throws Exception {
        String name = validName(r.str("name"));
        String color = validColor(r.str("color"));
        long id;
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO projects (name, color, owner_id) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setString(2, color);
            ps.setString(3, r.userId);
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            id = keys.getLong(1);
        }
        addMember(c, id, r.userId);
        return get(c, r.userId, id);
    }

    private Object update(Connection c, Request r, long id) throws Exception {
        requireOwner(c, r.userId, id);
        String name = r.str("name");
        String color = r.str("color");
        if (name != null) {
            exec(c, "UPDATE projects SET name = ? WHERE id = ?", validName(name), id);
        }
        if (color != null) {
            exec(c, "UPDATE projects SET color = ? WHERE id = ?", validColor(color), id);
        }
        return get(c, r.userId, id);
    }

    private Object delete(Connection c, String uid, long id) throws SQLException {
        if (isOwner(c, uid, id)) {
            exec(c, "DELETE FROM projects WHERE id = ?", id);
        } else {
            exec(c, "DELETE FROM project_members WHERE project_id = ? AND user_id = ?", id, uid);
        }
        return Map.of("ok", true);
    }

    private Object share(Connection c, String uid, long id) throws SQLException {
        requireOwner(c, uid, id);
        // Chỉ sinh key mới nếu dự án chưa có key.
        for (int attempt = 0; attempt < 5; attempt++) {
            try {
                exec(c, "UPDATE projects SET share_key = ? WHERE id = ? AND share_key IS NULL", newKey(), id);
                return get(c, uid, id);
            } catch (SQLException e) {
                // Trùng key (rất hiếm) — thử lại.
            }
        }
        throw new SQLException("Không tạo được key chia sẻ");
    }

    private Object unshare(Connection c, String uid, long id) throws SQLException {
        requireOwner(c, uid, id);
        exec(c, "UPDATE projects SET share_key = NULL WHERE id = ?", id);
        exec(c, "DELETE FROM project_members WHERE project_id = ? AND user_id <> ?", id, uid);
        return get(c, uid, id);
    }

    private Object invite(Connection c, String uid, String key) throws SQLException {
        String sql = "SELECT p.id, p.name, p.color, u.name AS owner_name,"
                + " (SELECT COUNT(*) FROM project_members m WHERE m.project_id = p.id) AS member_count,"
                + " EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = ?) AS joined"
                + " FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.share_key = ?";
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, uid);
            ps.setString(2, key == null ? "" : key.trim().toUpperCase());
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                throw new ApiException(404, "Link mời không hợp lệ hoặc key đã bị thu hồi");
            }
            Map<String, Object> out = new LinkedHashMap<>();
            boolean joined = rs.getBoolean("joined");
            // Chỉ trả id dự án cho người đã là thành viên.
            if (joined) {
                out.put("id", rs.getLong("id"));
            }
            out.put("name", rs.getString("name"));
            out.put("color", rs.getString("color"));
            out.put("ownerName", rs.getString("owner_name"));
            out.put("memberCount", rs.getInt("member_count"));
            out.put("joined", joined);
            return out;
        }
    }

    private Object join(Connection c, Request r) throws Exception {
        String key = r.str("key");
        if (key == null || key.isEmpty()) {
            throw ApiException.badRequest("Vui lòng nhập key");
        }
        long id;
        try (PreparedStatement ps = c.prepareStatement("SELECT id FROM projects WHERE share_key = ?")) {
            ps.setString(1, key.toUpperCase());
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                throw new ApiException(404, "Key không tồn tại hoặc đã bị thu hồi");
            }
            id = rs.getLong(1);
        }
        addMember(c, id, r.userId);
        return get(c, r.userId, id);
    }

    // ---------- helpers ----------

    static boolean isMember(Connection c, String uid, long projectId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?")) {
            ps.setLong(1, projectId);
            ps.setString(2, uid);
            return ps.executeQuery().next();
        }
    }

    private static boolean isOwner(Connection c, String uid, long id) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT owner_id FROM projects WHERE id = ?")) {
            ps.setLong(1, id);
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                throw ApiException.notFound();
            }
            return uid.equals(rs.getString(1));
        }
    }

    private static void requireOwner(Connection c, String uid, long id) throws SQLException {
        if (!isOwner(c, uid, id)) {
            throw ApiException.forbidden();
        }
    }

    private static void addMember(Connection c, long projectId, String uid) throws SQLException {
        exec(c, "MERGE INTO project_members (project_id, user_id) KEY (project_id, user_id) VALUES (?, ?)",
                projectId, uid);
    }

    private static void exec(Connection c, String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                ps.setObject(i + 1, params[i]);
            }
            ps.executeUpdate();
        }
    }

    private static String validName(String name) {
        if (name == null || name.isEmpty() || name.length() > 200) {
            throw ApiException.badRequest("Tên dự án phải từ 1 đến 200 ký tự");
        }
        return name;
    }

    private static String validColor(String color) {
        return color != null && COLOR.matcher(color).matches() ? color : "#808080";
    }

    private static String newKey() {
        StringBuilder sb = new StringBuilder("SB-");
        for (int i = 0; i < 8; i++) {
            if (i == 4) {
                sb.append('-');
            }
            sb.append(KEY_CHARS.charAt(RANDOM.nextInt(KEY_CHARS.length())));
        }
        return sb.toString();
    }
}
