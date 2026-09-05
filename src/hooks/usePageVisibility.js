import { useEffect, useState } from 'react'

/**
 * Tracks document.visibilityState so hooks/components can pause polling or
 * streaming work while the tab is backgrounded (saves CPU/battery/network)
 * and react immediately when it becomes visible again (keeps data timely
 * instead of waiting out a stale interval).
 */
export function usePageVisibility() {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
