package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Trạng thái online của những người dùng chung ít nhất một dự án với mình ("bạn đồng hành").
 *
 * GET  /api/presence          — danh sách bạn đồng hành kèm trạng thái
 * POST /api/presence          — heartbeat (UserFilter đã cập nhật last_seen), trả về như GET
 * POST /api/presence/offline  — báo rời trang, đánh dấu offline ngay
 */
@WebServlet("/api/presence/*")
public class PresenceServlet extends ApiServlet {

    /** Không có heartbeat trong khoảng này thì coi là offline. */
    static final int ONLINE_SECONDS = 90;

    @Override
    protected Object handle(Request r) throws Exception {
        try (Connection c = Db.get()) {
            if (r.is("POST", 1) && r.path[0].equals("offline")) {
                try (PreparedStatement ps = c.prepareStatement(
                        "UPDATE users SET last_seen = DATEADD('SECOND', ?, CURRENT_TIMESTAMP) WHERE id = ?")) {
                    ps.setInt(1, -ONLINE_SECONDS);
                    ps.setString(2, r.userId);
                    ps.executeUpdate();
                }
                return Map.of("ok", true);
            }
            if (r.is("GET", 0) || r.is("POST", 0)) {
                return partners(c, r.userId);
            }
            throw ApiException.notFound();
        }
    }

    private static List<Map<String, Object>> partners(Connection c, String uid) throws SQLException {
        String myProjects = "(SELECT project_id FROM project_members WHERE user_id = ?)";
        String sql = "SELECT u.pub_id, u.name, DATEDIFF('SECOND', u.last_seen, CURRENT_TIMESTAMP) AS seen_ago,"
                + " (SELECT COUNT(*) FROM tasks t WHERE t.owner_id = u.id AND NOT t.done"
                + "   AND t.project_id IN " + myProjects + ") AS open_count,"
                + " (SELECT COUNT(*) FROM tasks t WHERE t.owner_id = u.id AND t.done"
                + "   AND t.project_id IN " + myProjects + ") AS done_count"
                + " FROM users u WHERE u.id <> ? AND u.id IN"
                + "   (SELECT user_id FROM project_members WHERE project_id IN " + myProjects + ")"
                + " ORDER BY u.name";
        List<Map<String, Object>> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            for (int i = 1; i <= 4; i++) {
                ps.setString(i, uid);
            }
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("id", rs.getString("pub_id"));
                p.put("name", rs.getString("name"));
                int ago = rs.getInt("seen_ago");
                boolean seen = !rs.wasNull();
                p.put("online", seen && ago < ONLINE_SECONDS);
                p.put("lastSeenAgo", seen ? ago : null);
                p.put("openCount", rs.getInt("open_count"));
                p.put("doneCount", rs.getInt("done_count"));
                out.add(p);
            }
        }
        return out;
    }
}
