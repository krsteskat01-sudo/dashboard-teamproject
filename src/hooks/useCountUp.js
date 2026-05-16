import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from 0 to `target` over `duration` ms using requestAnimationFrame.
 * Uses an ease-out cubic curve for a natural deceleration feel.
 *
 * @param {number} target - final value to count up to
 * @param {number} duration - animation duration in ms (default 1500)
 * @param {number} decimals - decimal places to keep (default 0)
 * @returns {number} current animated value
 */
export function useCountUp(target, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(0)
  const frameRef     = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    startTimeRef.current = null
    setValue(0)

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp

      const elapsed  = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic: fast start, slow finish
      const eased    = 1 - Math.pow(1 - progress, 3)

      setValue(parseFloat((eased * target).toFixed(decimals)))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, decimals])

  return value
}