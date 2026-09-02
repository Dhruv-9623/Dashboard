package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ErrorCode;

public class ValidationException extends AppException {
    public ValidationException(String message) {
        super(ErrorCode.VALIDATION_ERROR, message);
    }

    public ValidationException(String message, Throwable cause) {
        super(ErrorCode.VALIDATION_ERROR, message, cause);
    }
}
