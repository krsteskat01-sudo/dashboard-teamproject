import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} - NEXT Vision` : 'NEXT Vision'
    return () => { document.title = prev }
  }, [title])
}
