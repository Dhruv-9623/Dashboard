package com.VentureCapitals.Dashboard.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** A year that hasn't happened yet is refused. Null passes; pair with @NotNull when the year is required. */
@Documented
@Constraint(validatedBy = NotFutureYearValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface NotFutureYear {
    String message() default "Year can't be in the future";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
