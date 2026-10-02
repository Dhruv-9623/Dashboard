import { ApiError } from '@/lib/api-client'

/**
 * Per-field validation messages from a failed mutation (the backend's `fieldErrors` map on
 * VALIDATION_ERROR). Derived from the error itself, so there's no state to keep in sync.
 *
 * ```tsx
 * const fields = useFieldErrors(mutation.error)
 * <Input id="firm-name" {...fields.a11y('name', 'firm-name')} />
 * {fields.message('name') && <FieldError id={fields.errorId('firm-name')}>{fields.message('name')}</FieldError>}
 * ```
 */
export function useFieldErrors(error: unknown) {
  const errors: Record<string, string> = error instanceof ApiError ? error.fieldErrors : {}
  const hasFieldErrors = Object.keys(errors).length > 0
  // Fields the form actually renders inline. Filled during render by message()/a11y(), which run
  // before summary() because the summary alert sits after the fields in the markup.
  const shownInline = new Set<string>()

  const errorId = (inputId: string) => `${inputId}-error`

  const message = (field: string): string | undefined => {
    shownInline.add(field)
    return errors[field]
  }

  /** aria-invalid + aria-describedby for the input, only while that field has an error. */
  const a11y = (field: string, inputId: string) => {
    shownInline.add(field)
    return errors[field]
      ? { 'aria-invalid': true as const, 'aria-describedby': errorId(inputId) }
      : {}
  }

  /**
   * The form-level message. Anything the form doesn't show inline is spelled out here, so a
   * validation error on an unwired field is never swallowed.
   */
  const summary = (fallback: (error: unknown) => string) => {
    if (!hasFieldErrors) return fallback(error)
    const unshown = Object.entries(errors)
      .filter(([field]) => !shownInline.has(field))
      .map(([, message]) => message)
    return unshown.length > 0 ? unshown.join(' ') : 'Please fix the highlighted fields.'
  }

  return { errors, hasFieldErrors, message, a11y, errorId, summary }
}
