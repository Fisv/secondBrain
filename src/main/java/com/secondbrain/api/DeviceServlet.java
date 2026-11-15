package com.secondbrain.api;

import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Ghép điện thoại/máy khác vào cùng tài khoản để đồng bộ dữ liệu.
 *
 * GET    /api/devices            — {current, pairPending, devices: [{id, name, createdAt, lastSeen, current}]}
 * POST   /api/devices/pair       — tạo mã ghép 10 phút: {code, ttl, urls: [{kind, label, url}]}
 * DELETE /api/devices/pair       — huỷ mã đang chờ
 * POST   /api/devices/claim      — thiết bị mới gửi {code, name} → nhận cookie thiết bị
 * PATCH  /api/devices/{id}       — đổi tên {name}
 * DELETE /api/devices/{id}       — thu hồi thiết bị
 * POST   /api/devices/leave      — thiết bị hiện tại tự ngắt kết nối
 */
@WebServlet("/api/devices/*")
public class DeviceServlet extends ApiServlet {

    @Override
    protected Object handle(Request r) throws Exception {
        String current = (String) r.raw.getAttribute(Devices.DEVICE_ATTR);
        try (Connection c = Db.get()) {
            if (r.is("GET", 0)) {
                return list(c, r.userId, current);
            }
            String a = r.path.length > 0 ? r.path[0] : "";
            if (a.equals("pair") && r.is("POST", 1)) {
                String code = Devices.newCode(r.userId);
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("code", code.substring(0, 4) + "-" + code.substring(4));
                out.put("ttl", Devices.CODE_TTL_MS / 1000);
                out.put("urls", urls(r.raw));
                return out;
            }
            if (a.equals("pair") && r.is("DELETE", 1)) {
                Devices.cancel(r.userId);
                return Map.of("ok", true);
            }
            if (a.equals("claim") && r.is("POST", 1)) {
                String owner = Devices.claim(r.str("code"), r.raw.getRemoteAddr());
                String token = Devices.create(c, owner, deviceName(r.str("name")));
                Devices.setCookie(r.raw, r.resp, token);
                try (PreparedStatement ps = c.prepareStatement("SELECT name FROM users WHERE id = ?")) {
                    ps.setString(1, owner);
                    ResultSet rs = ps.executeQuery();
                    rs.next();
                    return Map.of("ok", true, "name", rs.getString(1));
                }
            }
            if (a.equals("leave") && r.is("POST", 1)) {
                if (current != null) {
                    delete(c, current, r.userId);
                }
                Devices.clearCookie(r.raw, r.resp);
                return Map.of("ok", true);
            }
            if (r.is("PATCH", 1)) {
                try (PreparedStatement ps = c.prepareStatement("UPDATE devices SET name = ? WHERE id = ? AND user_id = ?")) {
                    ps.setString(1, deviceName(r.str("name")));
                    ps.setString(2, a);
                    ps.setString(3, r.userId);
                    if (ps.executeUpdate() == 0) {
                        throw ApiException.notFound();
                    }
                }
                return Map.of("ok", true);
            }
            if (r.is("DELETE", 1)) {
                if (!delete(c, a, r.userId)) {
                    throw ApiException.notFound();
                }
                if (a.equals(current)) {
                    Devices.clearCookie(r.raw, r.resp);
                }
                return Map.of("ok", true);
            }
            throw ApiException.notFound();
        }
    }

    private static Map<String, Object> list(Connection c, String uid, String current) throws SQLException {
        List<Map<String, Object>> devices = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT id, name, created_at, last_seen,"
                + " DATEDIFF('SECOND', last_seen, CURRENT_TIMESTAMP) AS ago FROM devices WHERE user_id = ? ORDER BY created_at")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> d = new LinkedHashMap<>();
                d.put("id", rs.getString("id"));
                d.put("name", rs.getString("name"));
                d.put("createdAt", iso(rs.getTimestamp("created_at")));
                d.put("lastSeen", iso(rs.getTimestamp("last_seen")));
                d.put("lastSeenAgo", rs.getInt("ago"));
                d.put("current", rs.getString("id").equals(current));
                devices.add(d);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("current", current);
        out.put("pairPending", Devices.hasPending(uid));
        out.put("devices", devices);
        return out;
    }

    private static boolean delete(Connection c, String id, String uid) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("DELETE FROM devices WHERE id = ? AND user_id = ?")) {
            ps.setString(1, id);
            ps.setString(2, uid);
            return ps.executeUpdate() > 0;
        }
    }

    private static String deviceName(String s) {
        if (s == null || s.isBlank()) {
            return "Thiết bị mới";
        }
        s = s.strip();
        return s.length() > 60 ? s.substring(0, 60) : s;
    }

    private static String iso(Timestamp t) {
        return t == null ? null : t.toInstant().toString();
    }

    // ---------- địa chỉ để điện thoại mở được ----------

    private static final List<String> ORDER = List.of("https", "current", "wifi", "lan", "tailscale", "vpn");

    /** Các địa chỉ của máy chủ mà thiết bị khác có thể truy cập (máy tính thường đang mở bằng localhost). */
    static List<Map<String, String>> urls(HttpServletRequest req) {
        String ctx = req.getContextPath() + "/";
        String fwdProto = req.getHeader("X-Forwarded-Proto");
        String scheme = fwdProto != null ? fwdProto : req.getScheme();
        String host = req.getHeader("X-Forwarded-Host") != null ? req.getHeader("X-Forwarded-Host") : req.getHeader("Host");
        List<Map<String, String>> out = new ArrayList<>();
        String serverName = req.getServerName();
        boolean local = serverName.equals("localhost") || serverName.startsWith("127.") || serverName.equals("[::1]");
        // Địa chỉ HTTPS cấu hình sẵn (VD Tailscale Serve) — cài được app và dùng khi mất mạng.
        String pub = req.getServletContext().getInitParameter("public.url");
        if (pub == null || pub.isBlank()) {
            pub = System.getenv("SB_PUBLIC_URL");
        }
        if (pub != null && !pub.isBlank()) {
            String p = pub.strip().endsWith("/") ? pub.strip() : pub.strip() + "/";
            out.add(url("https", "HTTPS (cài app, dùng khi mất mạng)", p));
        }
        if (!local && host != null) {
            String cur = scheme + "://" + host + ctx;
            if (out.stream().noneMatch(x -> x.get("url").equals(cur))) {
                out.add(url("current", "Địa chỉ đang mở", cur));
            }
        }
        int port = req.getLocalPort();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) {
                    continue;
                }
                for (InetAddress addr : Collections.list(ni.getInetAddresses())) {
                    if (!(addr instanceof Inet4Address) || addr.isLoopbackAddress() || addr.isLinkLocalAddress()) {
                        continue;
                    }
                    String ip = addr.getHostAddress();
                    String u = "http://" + ip + ":" + port + ctx;
                    if (out.stream().anyMatch(x -> x.get("url").equals(u) || (host != null && host.startsWith(ip)))) {
                        continue;
                    }
                    String[] kl = classify(ni, ip);
                    out.add(url(kl[0], kl[1], u));
                }
            }
        } catch (SocketException e) {
            // không đọc được card mạng — vẫn trả về địa chỉ đang mở (nếu có)
        }
        out.sort(Comparator.comparingInt(m -> ORDER.indexOf(m.get("kind"))));
        return out;
    }

    private static String[] classify(NetworkInterface ni, String ip) {
        String n = (ni.getDisplayName() + " " + ni.getName()).toLowerCase(Locale.ROOT);
        String[] p = ip.split("\\.");
        int a = Integer.parseInt(p[0]), b = Integer.parseInt(p[1]);
        if (n.contains("tailscale") || (a == 100 && b >= 64 && b <= 127)) {
            return new String[]{"tailscale", "Tailscale (dùng được ở mọi nơi)"};
        }
        if (n.matches(".*(vpn|warp|cloudflare|virtual|hyper-v|vmware|virtualbox|vbox|wsl|radmin|zerotier|hamachi|docker|vethernet).*")) {
            return new String[]{"vpn", ni.getDisplayName()};
        }
        if (n.matches(".*(wi-?fi|wireless|wlan|802\\.11).*")) {
            return new String[]{"wifi", "Wi-Fi (điện thoại cùng mạng Wi-Fi)"};
        }
        return new String[]{"lan", "Mạng nội bộ (cùng mạng với máy tính)"};
    }

    private static Map<String, String> url(String kind, String label, String url) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("kind", kind);
        m.put("label", label);
        m.put("url", url);
        return m;
    }
}
