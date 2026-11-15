package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/**
 * Nhận diện người dùng bằng cookie dài hạn (chưa có đăng nhập).
 * Lần đầu truy cập sẽ tự tạo một user mới.
 */
@WebFilter("/api/*")
public class UserFilter extends HttpFilter {

    static final String USER_ATTR = "userId";
    private static final String COOKIE = "sb_uid";
    private static final int ONE_YEAR = 365 * 24 * 3600;

    @Override
    protected void doFilter(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        String uid = null;
        try {
            // Thiết bị đã ghép (điện thoại...) dùng token riêng, ưu tiên hơn cookie user.
            String devToken = readCookie(req, Devices.COOKIE);
            if (devToken != null) {
                Devices.Resolved d = Devices.resolve(devToken);
                if (d != null && touch(d.userId())) {
                    uid = d.userId();
                    req.setAttribute(Devices.DEVICE_ATTR, d.deviceId());
                } else {
                    Devices.clearCookie(req, resp);   // đã bị thu hồi
                }
            }
            if (uid == null) {
                uid = readCookie(req, COOKIE);
            }
            // Thiết bị mới đang ghép: không tạo tài khoản rỗng chỉ để rồi bỏ đi.
            boolean claiming = uid == null && req.getRequestURI().endsWith("/api/devices/claim");
            if (!claiming && (uid == null || (req.getAttribute(Devices.DEVICE_ATTR) == null && !touch(uid)))) {
                uid = UUID.randomUUID().toString();
                create(uid);
                Cookie c = new Cookie(COOKIE, uid);
                c.setHttpOnly(true);
                c.setMaxAge(ONE_YEAR);
                c.setPath(req.getContextPath().isEmpty() ? "/" : req.getContextPath());
                resp.addCookie(c);
            }
        } catch (SQLException e) {
            throw new ServletException(e);
        }
        req.setAttribute(USER_ATTR, uid);
        chain.doFilter(req, resp);
    }

    private static String readCookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) {
            return null;
        }
        for (Cookie c : req.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    /** Cập nhật thời điểm hoạt động gần nhất; trả về false nếu user không tồn tại. */
    private static boolean touch(String uid) throws SQLException {
        try (Connection c = Db.get();
             PreparedStatement ps = c.prepareStatement("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?")) {
            ps.setString(1, uid);
            return ps.executeUpdate() > 0;
        }
    }

    private static void create(String uid) throws SQLException {
        try (Connection c = Db.get();
             PreparedStatement ps = c.prepareStatement("INSERT INTO users (id, name, pub_id, last_seen)"
                     + " VALUES (?, ?, " + Db.NEW_PUB_ID + ", CURRENT_TIMESTAMP)")) {
            ps.setString(1, uid);
            ps.setString(2, "Bạn");
            ps.executeUpdate();
        }
    }
}
