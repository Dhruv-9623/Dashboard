package com.VentureCapitals.Dashboard.common.exception;

import com.VentureCapitals.Dashboard.common.ApiResponse;
import com.VentureCapitals.Dashboard.common.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(ValidationException e) {
        log.warn("Validation error: {}", e.getMessage());
        return error(HttpStatus.BAD_REQUEST, e.getErrorCode(), e.getMessage());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException e) {
        log.warn("Entity not found: {}", e.getMessage());
        return error(HttpStatus.NOT_FOUND, e.getErrorCode(), e.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException e) {
        log.warn("Forbidden: {}", e.getMessage());
        return error(HttpStatus.FORBIDDEN, e.getErrorCode(), e.getMessage());
    }

    /** @PreAuthorize denials. Without this the catch-all below turned them into 500s. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException e) {
        log.warn("Access denied: {}", e.getMessage());
        return error(HttpStatus.FORBIDDEN, ErrorCode.UNAUTHORIZED, "You don't have permission to do this");
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRuleViolation(BusinessRuleViolationException e) {
        log.warn("Business rule violation: {}", e.getMessage());
        return error(HttpStatus.CONFLICT, e.getErrorCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        log.warn("Request validation failed: fields={}", fieldErrors.keySet());

        String message = fieldErrors.isEmpty() ? "Invalid request" : fieldErrors.values().iterator().next();
        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .success(false)
                .errorCode(ErrorCode.VALIDATION_ERROR)
                .message(message)
                .fieldErrors(fieldErrors)
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException e) {
        log.warn("Unreadable request body: {}", e.getMostSpecificCause().getMessage());
        return error(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_REQUEST, "The request body is malformed or has an invalid value");
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadParameter(Exception e) {
        log.warn("Bad request parameter: {}", e.getMessage());
        return error(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_REQUEST, e.getMessage());
    }

    /** Unmapped paths. Without this the catch-all below reported missing endpoints as 500s. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException e) {
        return error(HttpStatus.NOT_FOUND, ErrorCode.ENTITY_NOT_FOUND, "No endpoint at /" + e.getResourcePath());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, ErrorCode.INVALID_REQUEST, e.getMessage());
    }

    /** Unique / foreign-key constraint hits (duplicate owner, member still referenced, races). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation: {}", e.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT, ErrorCode.BUSINESS_RULE_VIOLATION,
                "This change conflicts with existing data");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception e) {
        log.error("Unexpected error", e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, "An unexpected error occurred");
    }

    private ResponseEntity<ApiResponse<Void>> error(HttpStatus status, ErrorCode code, String message) {
        return ResponseEntity.status(status).body(ApiResponse.error(code, message));
    }
}
