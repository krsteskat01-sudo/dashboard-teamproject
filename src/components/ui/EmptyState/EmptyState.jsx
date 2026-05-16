import { cloneElement, isValidElement } from 'react'
import { motion } from 'framer-motion'
import Button from '../Button/Button'
import './EmptyState.css'

/**
 * Centered placeholder shown when a list or data view has no content.
 *
 * @param {ReactNode} icon - lucide-react icon element; size is overridden by iconSize
 * @param {number} iconSize - icon size in px (default 48)
 * @param {string} title
 * @param {string} description
 * @param {{ label: string, onClick: function, variant?: string }} action - optional CTA
 * @param {'sm'|'md'|'lg'} size - controls overall padding and font scale
 * @param {string} className
 */
function EmptyState({
  icon,
  iconSize = 48,
  title,
  description,
  action,
  size = 'md',
  className = '',
}) {
  const sizedIcon =
    isValidElement(icon) ? cloneElement(icon, { size: iconSize }) : icon

  return (
    <motion.div
      className={['empty-state', `empty-state--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {sizedIcon && (
        <div
          className="empty-state__icon-wrap"
          style={{
            width: iconSize * 2,
            height: iconSize * 2,
          }}
        >
          {sizedIcon}
        </div>
      )}

      {title && <h3 className="empty-state__title">{title}</h3>}

      {description && (
        <p className="empty-state__description">{description}</p>
      )}

      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          size="md"
          onClick={action.onClick}
          className="empty-state__action"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

export default EmptyState
