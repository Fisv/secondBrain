package com.secondbrain.api;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

/**
 * Lớp cơ sở cho các API JSON. Lớp con chỉ cần cài đặt {@link #handle}
 * và trả về đối tượng sẽ được chuyển thành JSON.
 */
public abstract class ApiServlet extends HttpServlet {

    protected static final Gson GSON = new Gson();

    protected abstract Object handle(Request r) throws Exception;

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json;charset=UTF-8");
        Object result;
        try {
            result = handle(new Request(req, resp));
        } catch (ApiException e) {
            resp.setStatus(e.status);
            result = Map.of("error", e.getMessage());
        } catch (Exception e) {
            log("API error " + req.getMethod() + " " + req.getRequestURI(), e);
            resp.setStatus(500);
            result = Map.of("error", "Lỗi máy chủ");
        }
        resp.getWriter().write(GSON.toJson(result));
    }

    /** Gói gọn request: phương thức, các đoạn đường dẫn, body JSON và user hiện tại. */
    protected static final class Request {
        public final HttpServletRequest raw;
        public final HttpServletResponse resp;
        public final String method;
        public final String[] path;
        public final String userId;
        private JsonObject body;

        Request(HttpServletRequest raw, HttpServletResponse resp) {
            this.raw = raw;
            this.resp = resp;
            this.method = raw.getMethod();
            String info = raw.getPathInfo();
            this.path = info == null || info.equals("/") ? new String[0] : info.substring(1).split("/");
            this.userId = (String) raw.getAttribute(UserFilter.USER_ATTR);
        }

        public JsonObject body() throws IOException {
            if (body == null) {
                try {
                    JsonElement el = JsonParser.parseReader(raw.getReader());
                    body = el.isJsonObject() ? el.getAsJsonObject() : new JsonObject();
                } catch (JsonParseException e) {
                    throw ApiException.badRequest("JSON không hợp lệ");
                }
            }
            return body;
        }

        public String str(String key) throws IOException {
            JsonElement el = body().get(key);
            return el == null || el.isJsonNull() ? null : el.getAsString().trim();
        }

        public long pathId(int index) {
            try {
                return Long.parseLong(path[index]);
            } catch (RuntimeException e) {
                throw ApiException.notFound();
            }
        }

        public boolean is(String method, int pathLength) {
            return this.method.equals(method) && path.length == pathLength;
        }
    }
}
