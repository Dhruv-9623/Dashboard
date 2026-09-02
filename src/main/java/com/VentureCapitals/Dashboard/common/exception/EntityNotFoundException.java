package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ErrorCode;

public class EntityNotFoundException extends AppException {
    public EntityNotFoundException(String message) {
        super(ErrorCode.ENTITY_NOT_FOUND, message);
    }

    public EntityNotFoundException(String message, Throwable cause) {
        super(ErrorCode.ENTITY_NOT_FOUND, message, cause);
    }
}
