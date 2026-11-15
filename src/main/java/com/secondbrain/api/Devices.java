package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ghép thiết bị: máy đang dùng tạo mã ghép ngắn hạn, thiết bị mới nhập/quét mã để nhận
 * một token riêng (cookie {@value #COOKIE}). Token chỉ lưu dạng băm SHA-256 trong CSDL.
 */
final class Devices {

    static final String COOKIE = "sb_dev";
    static final String DEVICE_ATTR = "deviceId";
    static final long CODE_TTL_MS = 10 * 60 * 1000L;

    private static final int COOKIE_AGE = 400 * 24 * 3600;
    /** Bỏ các ký tự dễ nhầm: 0/O, 1/I/L. */
    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int MAX_FAILS = 10;
    private static final SecureRandom RNG = new SecureRandom();

    /** Mã ghép đang chờ: code → (userId, hạn). Mỗi user chỉ có một mã còn hiệu lực. */
    private static final Map<String, Pending> CODES = new ConcurrentHashMap<>();
    /** Số lần nhập sai theo IP trong cửa sổ {@link #CODE_TTL_MS}. */
    private static final Map<String, Fails> FAILS = new ConcurrentHashMap<>();

    private record Pending(String userId, long expires) {
    }

    private static final class Fails {
        int count;
        long since;
    }

    record Resolved(String deviceId, String userId) {
    }

    private Devices() {
    }

    // ---------- mã ghép ----------

    static synchronized String newCode(String userId) {
        purge();
        CODES.values().removeIf(p -> p.userId.equals(userId));
        String code;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
            }
            code = sb.toString();
        } while (CODES.containsKey(code));
        CODES.put(code, new Pending(userId, System.currentTimeMillis() + CODE_TTL_MS));
        return code;
    }

    /** Có mã của user này còn chờ không (để máy tính biết điện thoại đã quét chưa). */
    static boolean hasPending(String userId) {
        long now = System.currentTimeMillis();
        return CODES.values().stream().anyMatch(p -> p.userId.equals(userId) && p.expires > now);
    }

    static void cancel(String userId) {
        CODES.values().removeIf(p -> p.userId.equals(userId));
    }

    /** Đổi mã lấy userId (dùng một lần). Ném 429 nếu IP này nhập sai quá nhiều. */
    static synchronized String claim(String rawCode, String ip) {
        long now = System.currentTimeMillis();
        Fails f = FAILS.computeIfAbsent(ip, k -> new Fails());
        if (now - f.since > CODE_TTL_MS) {
            f.count = 0;
            f.since = now;
        }
        if (f.count >= MAX_FAILS) {
            throw new ApiException(429, "Nhập sai quá nhiều lần. Thử lại sau 10 phút.");
        }
        String code = normalize(rawCode);
        Pending p = code == null ? null : CODES.remove(code);
        if (p == null || p.expires < now) {
            f.count++;
            throw ApiException.badRequest("Mã không đúng hoặc đã hết hạn. Tạo mã mới trên máy tính.");
        }
        return p.userId;
    }

    static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.toUpperCase().replaceAll("[^A-Z0-9]", "");
        return s.length() == 8 ? s : null;
    }

    private static void purge() {
        long now = System.currentTimeMillis();
        for (Iterator<Pending> it = CODES.values().iterator(); it.hasNext(); ) {
            if (it.next().expires < now) {
                it.remove();
            }
        }
        FAILS.values().removeIf(x -> now - x.since > CODE_TTL_MS);
    }

    // ---------- token thiết bị ----------

    /** Tạo thiết bị mới cho user, trả về token gốc (chỉ gửi cho thiết bị một lần qua cookie). */
    static String create(Connection c, String userId, String name) throws SQLException {
        byte[] raw = new byte[32];
        RNG.nextBytes(raw);
        String token = hex(raw);
        byte[] idb = new byte[6];
        RNG.nextBytes(idb);
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO devices (id, token_hash, user_id, name) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, hex(idb));
            ps.setString(2, sha256(token));
            ps.setString(3, userId);
            ps.setString(4, name);
            ps.executeUpdate();
        }
        return token;
    }

    /** Tra token → thiết bị; cập nhật lần hoạt động. Trả về null nếu token không còn hiệu lực. */
    static Resolved resolve(String token) throws SQLException {
        if (token == null || !token.matches("^[0-9a-f]{64}$")) {
            return null;
        }
        try (Connection c = Db.get();
             PreparedStatement ps = c.prepareStatement("SELECT id, user_id FROM devices WHERE token_hash = ?")) {
            ps.setString(1, sha256(token));
            ResultSet rs = ps.executeQuery();
            if (!rs.next()) {
                return null;
            }
            Resolved r = new Resolved(rs.getString(1), rs.getString(2));
            try (PreparedStatement up = c.prepareStatement(
                    "UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?")) {
                up.setString(1, r.deviceId);
                up.executeUpdate();
            }
            return r;
        }
    }

    static void setCookie(HttpServletRequest req, HttpServletResponse resp, String token) {
        resp.addHeader("Set-Cookie", cookie(req, token, COOKIE_AGE));
    }

    static void clearCookie(HttpServletRequest req, HttpServletResponse resp) {
        resp.addHeader("Set-Cookie", cookie(req, "", 0));
    }

    private static String cookie(HttpServletRequest req, String value, int maxAge) {
        String path = req.getContextPath().isEmpty() ? "/" : req.getContextPath();
        boolean secure = req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
        return COOKIE + "=" + value + "; Path=" + path + "; Max-Age=" + maxAge + "; HttpOnly; SameSite=Lax"
                + (secure ? "; Secure" : "");
    }

    private static String sha256(String s) {
        try {
            return hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) {
            sb.append(Character.forDigit((x >> 4) & 0xf, 16)).append(Character.forDigit(x & 0xf, 16));
        }
        return sb.toString();
    }
}
