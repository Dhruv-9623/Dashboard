package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ErrorCode;

public class BusinessRuleViolationException extends AppException {
    public BusinessRuleViolationException(String message) {
        super(ErrorCode.BUSINESS_RULE_VIOLATION, message);
    }

    public BusinessRuleViolationException(String message, Throwable cause) {
        super(ErrorCode.BUSINESS_RULE_VIOLATION, message, cause);
    }
}