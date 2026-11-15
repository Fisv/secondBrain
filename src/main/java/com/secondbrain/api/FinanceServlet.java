package com.secondbrain.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.secondbrain.db.Db;

import javax.servlet.annotation.WebServlet;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Sổ thu chi cá nhân — mỗi user chỉ thấy dữ liệu của mình.
 *
 * GET    /api/finance                 — toàn bộ sổ: {settings, tx, sources, goals, gtx}
 * PUT    /api/finance/settings        — {opening, budget, catBudgets}
 * POST   /api/finance/tx              — {type: in|out, amount, cat, date, note?, sourceId?}
 * PUT    /api/finance/tx/{id}         — như trên
 * DELETE /api/finance/tx/{id}
 * POST   /api/finance/sources         — {name, cat, freq: month|once|irregular, amount, day?, from, to?, note?}
 * PUT    /api/finance/sources/{id}
 * DELETE /api/finance/sources/{id}
 * POST   /api/finance/goals           — {name, kind: save|income|balance, target, deadline?, scope?, from?, color?, icon?, note?}
 * PUT    /api/finance/goals/{id}      — như trên
 * PATCH  /api/finance/goals/{id}      — {done: true|false}
 * DELETE /api/finance/goals/{id}
 * POST   /api/finance/goals/{id}/tx   — góp (+) hoặc rút (−) {amount, date, note?}
 * DELETE /api/finance/gtx/{id}
 */
@WebServlet("/api/finance/*")
public class FinanceServlet extends ApiServlet {

    private static final Pattern MONTH = Pattern.compile("^\\d{4}-(0[1-9]|1[0-2])$");
    private static final Pattern CAT = Pattern.compile("^[a-z0-9_-]{1,30}$");
    private static final Set<String> FREQS = Set.of("month", "once", "irregular");
    private static final Set<String> KINDS = Set.of("save", "income", "balance");
    private static final long MAX_AMOUNT = 1_000_000_000_000L;

    @Override
    protected Object handle(Request r) throws Exception {
        try (Connection c = Db.get()) {
            if (r.is("GET", 0)) {
                return all(c, r.userId);
            }
            String res = r.path.length > 0 ? r.path[0] : "";
            if (res.equals("settings") && r.is("PUT", 1)) {
                return saveSettings(c, r);
            }
            switch (res) {
                case "tx":
                    return crud(c, r, "fin_tx", this::txFields);
                case "sources":
                    return crud(c, r, "fin_sources", this::sourceFields);
                case "goals":
                    if (r.is("PATCH", 2)) {
                        long id = requireOwn(c, "fin_goals", r.pathId(1), r.userId);
                        boolean done = r.body().has("done") && r.body().get("done").getAsBoolean();
                        exec(c, "UPDATE fin_goals SET done_date = " + (done ? "CURRENT_DATE" : "NULL") + " WHERE id = ?", id);
                        return Map.of("ok", true);
                    }
                    if (r.is("POST", 3) && r.path[2].equals("tx")) {
                        return addGoalTx(c, r, requireOwn(c, "fin_goals", r.pathId(1), r.userId));
                    }
                    return crud(c, r, "fin_goals", this::goalFields);
                case "gtx":
                    if (r.is("DELETE", 2)) {
                        long id = r.pathId(1);
                        try (PreparedStatement ps = c.prepareStatement("DELETE FROM fin_goal_tx WHERE id = ?"
                                + " AND goal_id IN (SELECT id FROM fin_goals WHERE owner_id = ?)")) {
                            ps.setLong(1, id);
                            ps.setString(2, r.userId);
                            if (ps.executeUpdate() == 0) {
                                throw ApiException.notFound();
                            }
                        }
                        return Map.of("ok", true);
                    }
                    break;
                default:
                    break;
            }
            throw ApiException.notFound();
        }
    }

    // ---------- đọc ----------

    private Map<String, Object> all(Connection c, String uid) throws SQLException {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("settings", settings(c, uid));
        out.put("tx", rows(c, "SELECT id AS \"id\", type AS \"type\", amount AS \"amount\", cat AS \"cat\","
                + " tx_date AS \"date\", note AS \"note\", source_id AS \"sourceId\""
                + " FROM fin_tx WHERE owner_id = ? ORDER BY tx_date DESC, id DESC", uid));
        out.put("sources", rows(c, "SELECT id AS \"id\", name AS \"name\", cat AS \"cat\", freq AS \"freq\","
                + " amount AS \"amount\", pay_day AS \"day\", from_month AS \"from\", to_month AS \"to\", note AS \"note\""
                + " FROM fin_sources WHERE owner_id = ? ORDER BY id", uid));
        out.put("goals", rows(c, "SELECT id AS \"id\", name AS \"name\", kind AS \"kind\", target AS \"target\","
                + " deadline AS \"deadline\", scope AS \"scope\", from_month AS \"from\", color AS \"color\","
                + " icon AS \"icon\", note AS \"note\", created AS \"created\", done_date AS \"done\""
                + " FROM fin_goals WHERE owner_id = ? ORDER BY id", uid));
        out.put("gtx", rows(c, "SELECT x.id AS \"id\", x.goal_id AS \"goalId\", x.amount AS \"amount\","
                + " x.tx_date AS \"date\", x.note AS \"note\" FROM fin_goal_tx x"
                + " JOIN fin_goals g ON g.id = x.goal_id WHERE g.owner_id = ? ORDER BY x.tx_date DESC, x.id DESC", uid));
        return out;
    }

    private Map<String, Object> settings(Connection c, String uid) throws SQLException {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("opening", 0L);
        s.put("budget", 0L);
        s.put("catBudgets", new JsonObject());
        try (PreparedStatement ps = c.prepareStatement("SELECT * FROM fin_settings WHERE user_id = ?")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                s.put("opening", rs.getLong("opening"));
                s.put("budget", rs.getLong("budget"));
                s.put("catBudgets", JsonParser.parseString(rs.getString("cat_budgets")));
            }
        }
        return s;
    }

    /** Chạy truy vấn và trả về danh sách map theo tên cột (alias giữ nguyên chữ hoa/thường). */
    private static List<Map<String, Object>> rows(Connection c, String sql, String uid) throws SQLException {
        List<Map<String, Object>> out = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            ResultSetMetaData md = rs.getMetaData();
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    Object v = rs.getObject(i);
                    m.put(md.getColumnLabel(i), v instanceof Date ? v.toString() : v);
                }
                out.add(m);
            }
        }
        return out;
    }

    // ---------- ghi ----------

    private Object saveSettings(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        long opening = b.has("opening") ? amount(b.get("opening"), true) : 0;
        long budget = b.has("budget") ? amount(b.get("budget"), true) : 0;
        JsonObject cb = new JsonObject();
        if (b.has("catBudgets") && b.get("catBudgets").isJsonObject()) {
            for (Map.Entry<String, JsonElement> e : b.getAsJsonObject("catBudgets").entrySet()) {
                long v = amount(e.getValue(), true);
                if (CAT.matcher(e.getKey()).matches() && v > 0) {
                    cb.addProperty(e.getKey(), v);
                }
            }
        }
        try (PreparedStatement ps = c.prepareStatement(
                "MERGE INTO fin_settings (user_id, opening, budget, cat_budgets) KEY (user_id) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, r.userId);
            ps.setLong(2, Math.max(-MAX_AMOUNT, opening));
            ps.setLong(3, Math.max(0, budget));
            ps.setString(4, cb.toString());
            ps.executeUpdate();
        }
        return settings(c, r.userId);
    }

    @FunctionalInterface
    private interface FieldReader {
        Map<String, Object> read(Connection c, Request r) throws Exception;
    }

    /** POST /{res}, PUT /{res}/{id}, DELETE /{res}/{id} cho bảng có cột owner_id. */
    private Object crud(Connection c, Request r, String table, FieldReader fields) throws Exception {
        if (r.is("POST", 1)) {
            Map<String, Object> f = fields.read(c, r);
            List<String> cols = new ArrayList<>(f.keySet());
            String sql = "INSERT INTO " + table + " (owner_id, " + String.join(", ", cols) + ") VALUES (?"
                    + ", ?".repeat(cols.size()) + ")";
            try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, r.userId);
                int i = 2;
                for (String col : cols) {
                    ps.setObject(i++, f.get(col));
                }
                ps.executeUpdate();
                ResultSet keys = ps.getGeneratedKeys();
                keys.next();
                return Map.of("id", keys.getLong(1));
            }
        }
        if (r.is("PUT", 2)) {
            long id = requireOwn(c, table, r.pathId(1), r.userId);
            Map<String, Object> f = fields.read(c, r);
            List<String> sets = new ArrayList<>();
            for (String col : f.keySet()) {
                sets.add(col + " = ?");
            }
            try (PreparedStatement ps = c.prepareStatement(
                    "UPDATE " + table + " SET " + String.join(", ", sets) + " WHERE id = ?")) {
                int i = 1;
                for (Object v : f.values()) {
                    ps.setObject(i++, v);
                }
                ps.setLong(i, id);
                ps.executeUpdate();
            }
            return Map.of("id", id);
        }
        if (r.is("DELETE", 2)) {
            long id = requireOwn(c, table, r.pathId(1), r.userId);
            exec(c, "DELETE FROM " + table + " WHERE id = ?", id);
            return Map.of("ok", true);
        }
        throw ApiException.notFound();
    }

    private Map<String, Object> txFields(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        String type = r.str("type");
        if (!"in".equals(type) && !"out".equals(type)) {
            throw ApiException.badRequest("Loại giao dịch phải là thu hoặc chi");
        }
        Long sourceId = null;
        if ("in".equals(type) && b.has("sourceId") && !b.get("sourceId").isJsonNull() && !r.str("sourceId").isEmpty()) {
            sourceId = requireOwn(c, "fin_sources", parseId(r.str("sourceId")), r.userId);
        }
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("type", type);
        f.put("amount", positive(b.get("amount")));
        f.put("cat", cat(r.str("cat")));
        f.put("tx_date", date(r.str("date"), true));
        f.put("note", text(r.str("note"), 160));
        f.put("source_id", sourceId);
        return f;
    }

    private Map<String, Object> sourceFields(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        String freq = r.str("freq");
        if (!FREQS.contains(freq)) {
            throw ApiException.badRequest("Tần suất không hợp lệ");
        }
        String from = month(r.str("from"), true);
        String to = month(r.str("to"), false);
        if (to != null && to.compareTo(from) < 0) {
            throw ApiException.badRequest("Tháng kết thúc phải sau tháng bắt đầu");
        }
        Integer day = null;
        if (b.has("day") && !b.get("day").isJsonNull() && !r.str("day").isEmpty()) {
            day = Math.max(1, Math.min(31, b.get("day").getAsInt()));
        }
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("name", required(r.str("name"), 60, "Tên nguồn"));
        f.put("cat", cat(r.str("cat")));
        f.put("freq", freq);
        f.put("amount", positive(b.get("amount")));
        f.put("pay_day", day);
        f.put("from_month", from);
        f.put("to_month", "once".equals(freq) ? null : to);
        f.put("note", text(r.str("note"), 120));
        return f;
    }

    private Map<String, Object> goalFields(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        String kind = r.str("kind");
        if (!KINDS.contains(kind)) {
            throw ApiException.badRequest("Kiểu mục tiêu không hợp lệ");
        }
        String deadline = month(r.str("deadline"), !"save".equals(kind));
        String scope = "income".equals(kind) && "range".equals(r.str("scope")) ? "range" : "month";
        String from = "range".equals(scope) ? month(r.str("from"), true) : null;
        if (from != null && from.compareTo(deadline) > 0) {
            throw ApiException.badRequest("Tháng bắt đầu phải trước hạn");
        }
        String icon = r.str("icon");
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("name", required(r.str("name"), 60, "Tên mục tiêu"));
        f.put("kind", kind);
        f.put("target", positive(b.get("target")));
        f.put("deadline", deadline);
        f.put("scope", scope);
        f.put("from_month", from);
        f.put("color", b.has("color") ? Math.floorMod(b.get("color").getAsInt(), 8) : 0);
        f.put("icon", icon != null && icon.matches("^[a-zA-Z]{1,20}$") ? icon : "target");
        f.put("note", text(r.str("note"), 120));
        return f;
    }

    private Object addGoalTx(Connection c, Request r, long goalId) throws Exception {
        long amount = amount(r.body().get("amount"), true);
        if (amount == 0) {
            throw ApiException.badRequest("Số tiền phải khác 0");
        }
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO fin_goal_tx (goal_id, amount, tx_date, note) VALUES (?, ?, ?, ?)")) {
            ps.setLong(1, goalId);
            ps.setLong(2, amount);
            ps.setDate(3, date(r.str("date"), true));
            ps.setString(4, text(r.str("note"), 80));
            ps.executeUpdate();
        }
        return Map.of("ok", true);
    }

    // ---------- tiện ích ----------

    private static long requireOwn(Connection c, String table, long id, String uid) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT 1 FROM " + table + " WHERE id = ? AND owner_id = ?")) {
            ps.setLong(1, id);
            ps.setString(2, uid);
            if (!ps.executeQuery().next()) {
                throw ApiException.notFound();
            }
        }
        return id;
    }

    private static void exec(Connection c, String sql, long id) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            ps.executeUpdate();
        }
    }

    private static long parseId(String s) {
        try {
            return Long.parseLong(s);
        } catch (RuntimeException e) {
            throw ApiException.badRequest("Mã không hợp lệ");
        }
    }

    private static long amount(JsonElement el, boolean allowNegative) {
        long v;
        try {
            v = Math.round(el.getAsDouble());
        } catch (RuntimeException e) {
            throw ApiException.badRequest("Số tiền không hợp lệ");
        }
        if (Math.abs(v) > MAX_AMOUNT || (!allowNegative && v < 0)) {
            throw ApiException.badRequest("Số tiền không hợp lệ");
        }
        return v;
    }

    private static long positive(JsonElement el) {
        if (el == null || el.isJsonNull()) {
            throw ApiException.badRequest("Nhập số tiền");
        }
        long v = amount(el, false);
        if (v <= 0) {
            throw ApiException.badRequest("Số tiền phải lớn hơn 0");
        }
        return v;
    }

    private static String cat(String s) {
        if (s == null || !CAT.matcher(s).matches()) {
            throw ApiException.badRequest("Danh mục không hợp lệ");
        }
        return s;
    }

    private static String required(String s, int max, String label) {
        if (s == null || s.isEmpty() || s.length() > max) {
            throw ApiException.badRequest(label + " phải từ 1 đến " + max + " ký tự");
        }
        return s;
    }

    private static String text(String s, int max) {
        return s == null || s.isEmpty() ? null : s.length() > max ? s.substring(0, max) : s;
    }

    private static Date date(String s, boolean required) {
        if (s == null || s.isEmpty()) {
            if (required) {
                throw ApiException.badRequest("Chọn ngày");
            }
            return null;
        }
        try {
            return Date.valueOf(s);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Ngày không hợp lệ (yyyy-MM-dd)");
        }
    }

    private static String month(String s, boolean required) {
        if (s == null || s.isEmpty()) {
            if (required) {
                throw ApiException.badRequest("Chọn tháng");
            }
            return null;
        }
        if (!MONTH.matcher(s).matches()) {
            throw ApiException.badRequest("Tháng không hợp lệ (yyyy-MM)");
        }
        return s;
    }
}
