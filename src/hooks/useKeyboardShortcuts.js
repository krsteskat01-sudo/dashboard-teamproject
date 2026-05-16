import { useEffect, useRef } from 'react'

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Register global keyboard shortcuts.
 * shortcuts: [{ key, ctrl?, shift?, callback }]
 * Skips when focus is in an input/textarea (except Escape).
 */
export function useKeyboardShortcuts(shortcuts) {
  const ref = useRef(shortcuts)
  ref.current = shortcuts

  useEffect(() => {
    function handler(e) {
      const inInput = INPUT_TAGS.has(document.activeElement?.tagName) ||
                      document.activeElement?.isContentEditable

      for (const { key, ctrl = false, shift = false, callback } of ref.current) {
        if (inInput && key !== 'Escape') continue

        const ctrlMatch  = ctrl  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)
        const shiftMatch = shift ? e.shiftKey               : !e.shiftKey

        if (e.key === key && ctrlMatch && shiftMatch) {
          e.preventDefault()
          callback(e)
          return
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, []) // ref keeps shortcuts current without re-attaching listener
}
