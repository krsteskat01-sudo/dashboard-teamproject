import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import './Button.css'

/**
 * Primary action button with multiple variants, sizes, and loading state.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'|'success'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} loading - shows spinner and disables interaction
 * @param {boolean} disabled
 * @param {boolean} fullWidth
 * @param {ReactNode} leftIcon
 * @param {ReactNode} rightIcon
 * @param {'button'|'submit'|'reset'} type
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    type = 'button',
    className = '',
    ...props
  },
  ref
) {
  const iconSize = { sm: 14, md: 16, lg: 18 }[size] ?? 16

  return (
    <button
      ref={ref}
      type={type}
      className={[
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? 'btn--full' : '',
        loading ? 'btn--loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="btn__spinner" size={iconSize} aria-hidden="true" />
      )}
      {!loading && leftIcon && (
        <span className="btn__icon" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children && <span className="btn__label">{children}</span>}
      {!loading && rightIcon && (
        <span className="btn__icon" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
})

export default Button
