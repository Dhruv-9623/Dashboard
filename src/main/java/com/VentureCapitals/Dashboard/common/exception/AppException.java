package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ErrorCode;
import lombok.Getter;

@Getter
public abstract class AppException extends RuntimeException {
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AppException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
}
