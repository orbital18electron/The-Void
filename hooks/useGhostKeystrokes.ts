'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Options {
  onGhost: () => void
  idleMs?: number   // milliseconds of silence before a ghost appears
}

/**
 * Fires `onGhost` after the user has been idle for `idleMs`.
 * Resets the timer on any keydown event.
 * Adds a random jitter (±20%) so ghosts don't feel mechanical.
 */
export function useGhostKeystrokes({ onGhost, idleMs = 90_000 }: Options) {
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onGhostRef  = useRef(onGhost)
  onGhostRef.current = onGhost

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    // ±20% jitter so it feels organic
    const jitter  = (Math.random() * 0.4 - 0.2) * idleMs
    const delay   = idleMs + jitter
    timerRef.current = setTimeout(() => {
      onGhostRef.current()
      // After ghost fires, re-schedule for another one
      schedule()
    }, delay)
  }, [idleMs])

  useEffect(() => {
    schedule()

    const handleKey = () => schedule()
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [schedule])
}
