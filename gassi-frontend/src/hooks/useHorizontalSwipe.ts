import { useEffect, useRef } from 'react'

const SWIPE_THRESHOLD = 50

export default function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  aktiv: boolean
) {
  const ref = useRef<HTMLDivElement | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const unterdrueckeKlick = useRef(false)
  const aktionen = useRef({ onSwipeLeft, onSwipeRight })
  aktionen.current = { onSwipeLeft, onSwipeRight }

  useEffect(() => {
    const el = ref.current
    if (!el || !aktiv) return

    const beimStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button')) {
        start.current = null
        return
      }
      if (e.touches.length !== 1) {
        start.current = null
        return
      }
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY }
    }

    const beimBewegen = (e: TouchEvent) => {
      const s = start.current
      if (!s) return
      const t = e.touches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) && e.cancelable) {
        e.preventDefault()
      }
    }

    const beimEnde = (e: TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s || e.changedTouches.length === 0) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        unterdrueckeKlick.current = true
        if (dx < 0) aktionen.current.onSwipeLeft()
        else aktionen.current.onSwipeRight()
      }
    }

    const beimAbbruch = () => {
      start.current = null
    }

    const beimKlick = (e: MouseEvent) => {
      if (!unterdrueckeKlick.current) return
      unterdrueckeKlick.current = false
      e.preventDefault()
      e.stopPropagation()
    }

    el.addEventListener('touchstart', beimStart, { passive: true })
    el.addEventListener('touchmove', beimBewegen, { passive: false })
    el.addEventListener('touchend', beimEnde)
    el.addEventListener('touchcancel', beimAbbruch)
    el.addEventListener('click', beimKlick, { capture: true })
    return () => {
      el.removeEventListener('touchstart', beimStart)
      el.removeEventListener('touchmove', beimBewegen)
      el.removeEventListener('touchend', beimEnde)
      el.removeEventListener('touchcancel', beimAbbruch)
      el.removeEventListener('click', beimKlick, { capture: true })
    }
  }, [aktiv])

  return ref
}
