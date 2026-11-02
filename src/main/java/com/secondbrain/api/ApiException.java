package com.secondbrain.api;

public class ApiException extends RuntimeException {

    final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(400, message);
    }

    public static ApiException notFound() {
        return new ApiException(404, "Không tìm thấy");
    }

    public static ApiException forbidden() {
        return new ApiException(403, "Bạn không có quyền thực hiện thao tác này");
    }
}
