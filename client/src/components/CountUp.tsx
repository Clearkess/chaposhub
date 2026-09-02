import React, { useEffect, useRef, useState } from 'react'

// Animated "counts up when scrolled into view" number, used by the homepage
// stats/trust sections. Uses IntersectionObserver (fires once) + rAF with an
// ease-out curve, and respects prefers-reduced-motion by jumping straight to
// the target value instead of animating.
export default function CountUp({
  target,
  duration = 1600,
  suffix = ''
}: {
  target: number
  duration?: number
  suffix?: string
}) {
  const [value, setValue] = useState(0)
  const spanRef = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setValue(target)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const elapsed = now - start
              const progress = Math.min(1, elapsed / duration)
              const eased = 1 - Math.pow(1 - progress, 3)
              setValue(Math.floor(eased * target))
              if (progress < 1) {
                requestAnimationFrame(tick)
              } else {
                setValue(target)
              }
            }
            requestAnimationFrame(tick)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={spanRef}>
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}
