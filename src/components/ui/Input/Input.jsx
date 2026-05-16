import { forwardRef, useState, useId } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import './Input.css'

/**
 * Form input with label, icons, helper text, and validation states.
 *
 * @param {string} label
 * @param {string} helperText
 * @param {string} error - error message (also triggers error styling)
 * @param {boolean} success - success state styling
 * @param {ReactNode} leftIcon
 * @param {ReactNode} rightIcon
 * @param {string} leftAddon - text prefix inside border
 * @param {string} rightAddon - text suffix inside border
 * @param {boolean} fullWidth - default true
 * @param {string} type - standard HTML input type; 'password' adds eye toggle
 */
const Input = forwardRef(function Input(
  {
    label,
    helperText,
    error,
    success,
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    fullWidth = true,
    type = 'text',
    className = '',
    id: idProp,
    disabled,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)
  const generatedId = useId()
  const inputId = idProp || generatedId

  const resolvedType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  return (
    <div
      className={[
        'input-wrapper',
        fullWidth ? 'input-wrapper--full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}

      <div className="input-inner">
        {leftAddon && (
          <span className="input-addon input-addon--left">{leftAddon}</span>
        )}
        {leftIcon && (
          <span className="input-icon input-icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error
              ? `${inputId}-msg`
              : helperText
              ? `${inputId}-msg`
              : undefined
          }
          className={[
            'input-field',
            leftIcon || leftAddon ? 'input-field--has-left' : '',
            rightIcon || rightAddon || type === 'password' || error || success
              ? 'input-field--has-right'
              : '',
            error ? 'input-field--error' : '',
            success && !error ? 'input-field--success' : '',
            disabled ? 'input-field--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {/* Right side: password toggle takes priority, then status icons, then custom */}
        {type === 'password' && (
          <button
            type="button"
            className="input-icon input-icon--right input-icon--btn"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {type !== 'password' && error && (
          <span className="input-icon input-icon--right input-icon--error" aria-hidden="true">
            <AlertCircle size={16} />
          </span>
        )}
        {type !== 'password' && !error && success && (
          <span className="input-icon input-icon--right input-icon--success" aria-hidden="true">
            <CheckCircle2 size={16} />
          </span>
        )}
        {type !== 'password' && !error && !success && rightIcon && (
          <span className="input-icon input-icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        )}

        {rightAddon && (
          <span className="input-addon input-addon--right">{rightAddon}</span>
        )}
      </div>

      {(error || helperText) && (
        <p
          id={`${inputId}-msg`}
          className={['input-helper', error ? 'input-helper--error' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
})

export default Input
