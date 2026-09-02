package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ErrorCode;

public class UnauthorizedException extends AppException {
    public UnauthorizedException(String message) {
        super(ErrorCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(ErrorCode.UNAUTHORIZED, message, cause);
    }
}
