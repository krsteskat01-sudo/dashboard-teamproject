import './Card.css'

/**
 * Container card with glassmorphism aesthetic and compound sub-components.
 *
 * @param {'default'|'elevated'|'glass'|'outline'} variant
 * @param {'none'|'sm'|'md'|'lg'} padding
 * @param {boolean} hoverable - adds hover lift effect
 * @param {string} className
 * @param {CSSProperties} style
 */
function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  style,
  ...props
}) {
  return (
    <div
      className={[
        'card',
        `card--${variant}`,
        `card--pad-${padding}`,
        hoverable ? 'card--hoverable' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Card header row — title/actions side-by-side.
 */
Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={['card-header', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

/**
 * Card body — main scrollable content area.
 */
Card.Body = function CardBody({ children, className = '' }) {
  return (
    <div className={['card-body', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

/**
 * Card footer row — right-aligned actions by default.
 */
Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={['card-footer', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export default Card
