import { forwardRef, useId } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import './Select.css'

/**
 * Styled native select with label, placeholder, error, and helper text.
 *
 * @param {string} label
 * @param {string} helperText
 * @param {string} error
 * @param {Array<{value: string, label: string, disabled?: boolean}>} options
 * @param {string} placeholder - empty disabled option shown first
 * @param {boolean} fullWidth - default true
 */
const Select = forwardRef(function Select(
  {
    label,
    helperText,
    error,
    options = [],
    placeholder,
    fullWidth = true,
    className = '',
    id: idProp,
    disabled,
    children,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const selectId = idProp || generatedId

  return (
    <div
      className={[
        'select-wrapper',
        fullWidth ? 'select-wrapper--full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}

      <div className="select-inner">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${selectId}-msg`
              : helperText
              ? `${selectId}-msg`
              : undefined
          }
          className={[
            'select-field',
            error ? 'select-field--error' : '',
            disabled ? 'select-field--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span className="select-chevron" aria-hidden="true">
          {error ? (
            <AlertCircle size={16} className="select-chevron--error" />
          ) : (
            <ChevronDown size={16} />
          )}
        </span>
      </div>

      {(error || helperText) && (
        <p
          id={`${selectId}-msg`}
          className={[
            'select-helper',
            error ? 'select-helper--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
})

export default Select
