import './Badge.css'

/**
 * Inline label for status, categories, or tags.
 *
 * @param {'default'|'primary'|'success'|'warning'|'danger'|'info'} variant
 * @param {'sm'|'md'} size
 * @param {boolean} dot - show a colored dot prefix
 * @param {boolean} outline - transparent background, visible border
 * @param {string} className
 */
function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  outline = false,
  className = '',
  ...props
}) {
  return (
    <span
      className={[
        'badge',
        `badge--${variant}`,
        `badge--${size}`,
        outline ? 'badge--outline' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export default Badge
