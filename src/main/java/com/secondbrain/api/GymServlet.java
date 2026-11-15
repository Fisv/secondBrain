package com.secondbrain.api;

import com.google.gson.JsonArray;
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
import java.sql.Types;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Nhật ký tập gym cá nhân — mỗi user chỉ thấy dữ liệu của mình.
 *
 * GET    /api/gym                — {settings, workouts: [{..., sets: [...]}], body}
 * PUT    /api/gym/settings       — {weekTarget, height?, targetWeight?}
 * POST   /api/gym/workouts       — {date, title, duration?, note?, sets: [{exercise, muscle, reps, weight}]}
 * PUT    /api/gym/workouts/{id}  — như trên (thay toàn bộ danh sách set)
 * DELETE /api/gym/workouts/{id}
 * POST   /api/gym/body           — {date, weight, fat?, waist?, note?}
 * PUT    /api/gym/body/{id}
 * DELETE /api/gym/body/{id}
 */
@WebServlet("/api/gym/*")
public class GymServlet extends ApiServlet {

    private static final Pattern MUSCLE = Pattern.compile("^[a-z]{1,20}$");
    private static final int MAX_SETS = 150;

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
            if (res.equals("workouts")) {
                return workouts(c, r);
            }
            if (res.equals("body")) {
                return body(c, r);
            }
            throw ApiException.notFound();
        }
    }

    // ---------- đọc ----------

    private Map<String, Object> all(Connection c, String uid) throws SQLException {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("settings", settings(c, uid));

        Map<Long, Map<String, Object>> byId = new LinkedHashMap<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT id, w_date, title, duration_min, note FROM gym_workouts"
                + " WHERE owner_id = ? ORDER BY w_date DESC, id DESC")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> w = new LinkedHashMap<>();
                w.put("id", rs.getLong("id"));
                w.put("date", rs.getDate("w_date").toString());
                w.put("title", rs.getString("title"));
                w.put("duration", rs.getObject("duration_min"));
                w.put("note", rs.getString("note"));
                w.put("sets", new ArrayList<Map<String, Object>>());
                byId.put(rs.getLong("id"), w);
            }
        }
        try (PreparedStatement ps = c.prepareStatement("SELECT s.workout_id, s.exercise, s.muscle, s.reps, s.weight"
                + " FROM gym_sets s JOIN gym_workouts w ON w.id = s.workout_id WHERE w.owner_id = ? ORDER BY s.workout_id, s.pos")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> s = new LinkedHashMap<>();
                s.put("exercise", rs.getString("exercise"));
                s.put("muscle", rs.getString("muscle"));
                s.put("reps", rs.getInt("reps"));
                s.put("weight", rs.getDouble("weight"));
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> sets = (List<Map<String, Object>>) byId.get(rs.getLong("workout_id")).get("sets");
                sets.add(s);
            }
        }
        out.put("workouts", new ArrayList<>(byId.values()));

        List<Map<String, Object>> body = new ArrayList<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT id, m_date, weight, fat, waist, note FROM gym_body"
                + " WHERE owner_id = ? ORDER BY m_date DESC, id DESC")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> b = new LinkedHashMap<>();
                b.put("id", rs.getLong("id"));
                b.put("date", rs.getDate("m_date").toString());
                b.put("weight", rs.getDouble("weight"));
                b.put("fat", rs.getObject("fat"));
                b.put("waist", rs.getObject("waist"));
                b.put("note", rs.getString("note"));
                body.add(b);
            }
        }
        out.put("body", body);
        return out;
    }

    private Map<String, Object> settings(Connection c, String uid) throws SQLException {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("weekTarget", 3);
        try (PreparedStatement ps = c.prepareStatement("SELECT * FROM gym_settings WHERE user_id = ?")) {
            ps.setString(1, uid);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                s.put("weekTarget", rs.getInt("week_target"));
                s.put("height", rs.getObject("height_cm"));
                s.put("targetWeight", rs.getObject("target_weight"));
            }
        }
        return s;
    }

    // ---------- ghi ----------

    private Object saveSettings(Connection c, Request r) throws Exception {
        JsonObject b = r.body();
        int target = (int) Math.round(num(b.get("weekTarget"), 1, 14, "Số buổi mỗi tuần", true));
        Double height = optNum(b.get("height"), 100, 250, "Chiều cao");
        Double tw = optNum(b.get("targetWeight"), 25, 300, "Cân nặng mục tiêu");
        try (PreparedStatement ps = c.prepareStatement(
                "MERGE INTO gym_settings (user_id, week_target, height_cm, target_weight) KEY (user_id) VALUES (?, ?, ?, ?)")) {
            ps.setString(1, r.userId);
            ps.setInt(2, target);
            setDouble(ps, 3, height);
            setDouble(ps, 4, tw);
            ps.executeUpdate();
        }
        return settings(c, r.userId);
    }

    private Object workouts(Connection c, Request r) throws Exception {
        if (r.is("DELETE", 2)) {
            long id = requireOwn(c, "gym_workouts", r.pathId(1), r.userId);
            exec(c, "DELETE FROM gym_workouts WHERE id = ?", id);
            return Map.of("ok", true);
        }
        boolean create = r.is("POST", 1);
        if (!create && !r.is("PUT", 2)) {
            throw ApiException.notFound();
        }
        Long existing = create ? null : requireOwn(c, "gym_workouts", r.pathId(1), r.userId);
        JsonObject b = r.body();
        Date date = date(r.str("date"));
        String title = required(r.str("title"), 60, "Tên buổi tập");
        Double dur = optNum(b.get("duration"), 1, 600, "Thời lượng");
        String note = text(r.str("note"), 200);
        List<Object[]> sets = readSets(b.get("sets"));

        boolean auto = c.getAutoCommit();
        c.setAutoCommit(false);
        try {
            long id;
            if (create) {
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO gym_workouts (owner_id, w_date, title, duration_min, note)"
                        + " VALUES (?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
                    ps.setString(1, r.userId);
                    fillWorkout(ps, 2, date, title, dur, note);
                    ps.executeUpdate();
                    ResultSet keys = ps.getGeneratedKeys();
                    keys.next();
                    id = keys.getLong(1);
                }
            } else {
                id = existing;
                try (PreparedStatement ps = c.prepareStatement(
                        "UPDATE gym_workouts SET w_date = ?, title = ?, duration_min = ?, note = ? WHERE id = ?")) {
                    fillWorkout(ps, 1, date, title, dur, note);
                    ps.setLong(5, id);
                    ps.executeUpdate();
                }
                exec(c, "DELETE FROM gym_sets WHERE workout_id = ?", id);
            }
            try (PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO gym_sets (workout_id, pos, exercise, muscle, reps, weight) VALUES (?, ?, ?, ?, ?, ?)")) {
                int pos = 0;
                for (Object[] s : sets) {
                    ps.setLong(1, id);
                    ps.setInt(2, pos++);
                    ps.setString(3, (String) s[0]);
                    ps.setString(4, (String) s[1]);
                    ps.setInt(5, (Integer) s[2]);
                    ps.setDouble(6, (Double) s[3]);
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            c.commit();
            return Map.of("id", id);
        } catch (Exception e) {
            c.rollback();
            throw e;
        } finally {
            c.setAutoCommit(auto);
        }
    }

    private static void fillWorkout(PreparedStatement ps, int i, Date date, String title, Double dur, String note) throws SQLException {
        ps.setDate(i, date);
        ps.setString(i + 1, title);
        if (dur == null) {
            ps.setNull(i + 2, Types.INTEGER);
        } else {
            ps.setInt(i + 2, (int) Math.round(dur));
        }
        ps.setString(i + 3, note);
    }

    private static List<Object[]> readSets(JsonElement el) {
        List<Object[]> out = new ArrayList<>();
        if (el == null || el.isJsonNull()) {
            return out;
        }
        if (!el.isJsonArray()) {
            throw ApiException.badRequest("Danh sách set không hợp lệ");
        }
        JsonArray arr = el.getAsJsonArray();
        if (arr.size() > MAX_SETS) {
            throw ApiException.badRequest("Tối đa " + MAX_SETS + " set mỗi buổi");
        }
        for (JsonElement e : arr) {
            if (!e.isJsonObject()) {
                throw ApiException.badRequest("Set không hợp lệ");
            }
            JsonObject o = e.getAsJsonObject();
            String ex = o.has("exercise") && !o.get("exercise").isJsonNull() ? o.get("exercise").getAsString().trim() : "";
            String muscle = o.has("muscle") && !o.get("muscle").isJsonNull() ? o.get("muscle").getAsString() : "";
            if (ex.isEmpty() || ex.length() > 60) {
                throw ApiException.badRequest("Tên bài tập phải từ 1 đến 60 ký tự");
            }
            if (!MUSCLE.matcher(muscle).matches()) {
                throw ApiException.badRequest("Nhóm cơ không hợp lệ");
            }
            int reps = (int) Math.round(num(o.get("reps"), 1, 1000, "Số lần", true));
            double w = num(o.get("weight"), 0, 1000, "Mức tạ", false);
            out.add(new Object[]{ex, muscle, reps, Math.round(w * 100) / 100.0});
        }
        return out;
    }

    private Object body(Connection c, Request r) throws Exception {
        if (r.is("DELETE", 2)) {
            long id = requireOwn(c, "gym_body", r.pathId(1), r.userId);
            exec(c, "DELETE FROM gym_body WHERE id = ?", id);
            return Map.of("ok", true);
        }
        boolean create = r.is("POST", 1);
        if (!create && !r.is("PUT", 2)) {
            throw ApiException.notFound();
        }
        Long existing = create ? null : requireOwn(c, "gym_body", r.pathId(1), r.userId);
        JsonObject b = r.body();
        Date date = date(r.str("date"));
        double weight = num(b.get("weight"), 20, 400, "Cân nặng", true);
        Double fat = optNum(b.get("fat"), 2, 70, "Tỉ lệ mỡ");
        Double waist = optNum(b.get("waist"), 30, 250, "Vòng eo");
        String note = text(r.str("note"), 120);
        String sql = create
                ? "INSERT INTO gym_body (m_date, weight, fat, waist, note, owner_id) VALUES (?, ?, ?, ?, ?, ?)"
                : "UPDATE gym_body SET m_date = ?, weight = ?, fat = ?, waist = ?, note = ? WHERE id = ?";
        try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setDate(1, date);
            ps.setDouble(2, Math.round(weight * 10) / 10.0);
            setDouble(ps, 3, fat);
            setDouble(ps, 4, waist);
            ps.setString(5, note);
            if (create) {
                ps.setString(6, r.userId);
            } else {
                ps.setLong(6, existing);
            }
            ps.executeUpdate();
            if (create) {
                ResultSet keys = ps.getGeneratedKeys();
                keys.next();
                return Map.of("id", keys.getLong(1));
            }
        }
        return Map.of("id", existing);
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

    private static void setDouble(PreparedStatement ps, int i, Double v) throws SQLException {
        if (v == null) {
            ps.setNull(i, Types.DOUBLE);
        } else {
            ps.setDouble(i, v);
        }
    }

    private static double num(JsonElement el, double min, double max, String label, boolean required) {
        if (el == null || el.isJsonNull() || (el.isJsonPrimitive() && el.getAsString().trim().isEmpty())) {
            if (required) {
                throw ApiException.badRequest("Nhập " + label.toLowerCase());
            }
            return 0;
        }
        double v;
        try {
            v = el.getAsDouble();
        } catch (RuntimeException e) {
            throw ApiException.badRequest(label + " không hợp lệ");
        }
        if (Double.isNaN(v) || v < min || v > max) {
            throw ApiException.badRequest(label + " phải từ " + fmt(min) + " đến " + fmt(max));
        }
        return v;
    }

    private static Double optNum(JsonElement el, double min, double max, String label) {
        if (el == null || el.isJsonNull() || (el.isJsonPrimitive() && el.getAsString().trim().isEmpty())) {
            return null;
        }
        return num(el, min, max, label, true);
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
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

    private static Date date(String s) {
        if (s == null || s.isEmpty()) {
            throw ApiException.badRequest("Chọn ngày");
        }
        try {
            return Date.valueOf(s);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Ngày không hợp lệ (yyyy-MM-dd)");
        }
    }
}
