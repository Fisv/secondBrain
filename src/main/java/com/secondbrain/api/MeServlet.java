package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Map;

/** GET /api/me — thông tin user; PUT /api/me {name} — đổi tên hiển thị. */
@WebServlet("/api/me")
public class MeServlet extends ApiServlet {

    @Override
    protected Object handle(Request r) throws Exception {
        try (Connection c = Db.get()) {
            if (r.method.equals("PUT")) {
                String name = r.str("name");
                if (name == null || name.isEmpty() || name.length() > 100) {
                    throw ApiException.badRequest("Tên phải từ 1 đến 100 ký tự");
                }
                try (PreparedStatement ps = c.prepareStatement("UPDATE users SET name = ? WHERE id = ?")) {
                    ps.setString(1, name);
                    ps.setString(2, r.userId);
                    ps.executeUpdate();
                }
            } else if (!r.method.equals("GET")) {
                throw new ApiException(405, "Phương thức không được hỗ trợ");
            }
            try (PreparedStatement ps = c.prepareStatement("SELECT pub_id, name FROM users WHERE id = ?")) {
                ps.setString(1, r.userId);
                ResultSet rs = ps.executeQuery();
                rs.next();
                return Map.of("id", rs.getString(1), "name", rs.getString(2));
            }
        }
    }
}
