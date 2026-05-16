import './Spinner.css'

const SIZE_PX = { sm: 16, md: 24, lg: 32, xl: 48 }

/**
 * Circular loading spinner.
 *
 * @param {'sm'|'md'|'lg'|'xl'} size - diameter: 16/24/32/48px (default 'md')
 * @param {'primary'|'white'|'muted'} variant - color (default 'primary')
 * @param {string} label - optional text shown below spinner
 * @param {boolean} fullPage - centers in viewport with a translucent backdrop
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  label,
  fullPage = false,
}) {
  const px = SIZE_PX[size] ?? SIZE_PX.md

  const arc = (
    <span
      className={['spinner', `spinner--${size}`, `spinner--${variant}`].join(' ')}
      style={{ width: px, height: px }}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" strokeWidth="2.5" className="spinner__track" />
        <circle cx="12" cy="12" r="10" strokeWidth="2.5" className="spinner__fill" />
      </svg>
    </span>
  )

  if (fullPage) {
    return (
      <div className="spinner-overlay">
        <div className="spinner-page-inner">
          {arc}
          {label && <p className="spinner__label">{label}</p>}
        </div>
      </div>
    )
  }

  if (label) {
    return (
      <span className="spinner-labeled">
        {arc}
        <span className="spinner__label">{label}</span>
      </span>
    )
  }

  return arc
}

/**
 * Skeleton placeholder with shimmer animation used while content loads.
 *
 * @param {'text'|'circle'|'rect'} variant
 * @param {string} width - CSS width value (default: '100%')
 * @param {string} height - CSS height value (defaults: text→14px, circle→40px, rect→120px)
 * @param {number} lines - for variant 'text': number of lines to render (default 1)
 * @param {boolean} animate - enable shimmer animation (default true)
 */
export function SkeletonLoader({
  variant = 'rect',
  width,
  height,
  lines = 1,
  animate = true,
}) {
  const baseClass = ['skeleton', animate ? 'skeleton--animate' : '']
    .filter(Boolean)
    .join(' ')

  if (variant === 'circle') {
    const dim = width ?? height ?? '40px'
    return (
      <span
        className={[baseClass, 'skeleton--circle'].join(' ')}
        style={{ width: dim, height: dim }}
        aria-hidden="true"
      />
    )
  }

  if (variant === 'text') {
    const lineHeight = height ?? '14px'
    if (lines <= 1) {
      return (
        <span
          className={[baseClass, 'skeleton--text'].join(' ')}
          style={{ width: width ?? '100%', height: lineHeight }}
          aria-hidden="true"
        />
      )
    }
    return (
      <span
        className="skeleton-lines"
        style={{ width: width ?? '100%' }}
        aria-hidden="true"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={[baseClass, 'skeleton--text'].join(' ')}
            style={{
              width: i === lines - 1 ? '65%' : '100%',
              height: lineHeight,
            }}
          />
        ))}
      </span>
    )
  }

  // rect (default)
  return (
    <span
      className={[baseClass, 'skeleton--rect'].join(' ')}
      style={{ width: width ?? '100%', height: height ?? '120px' }}
      aria-hidden="true"
    />
  )
}

export default Spinner
