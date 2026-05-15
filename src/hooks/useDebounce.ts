// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

/**
 * Returns a debounced copy of `value` that only updates
 * after `delay` ms of silence.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}