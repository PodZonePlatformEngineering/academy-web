// Device-local UI preferences (like the BYO key and last-used curriculum): a
// convenience persisted in localStorage, never platform state. Used by the B9
// tutor panes so a hide/show survives reload on this device.

import { useCallback, useState } from 'react'

/** A boolean preference persisted under `key`; falls back when unset/SSR. */
export function usePersistentBool(
  key: string,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  })
  const set = useCallback(
    (next: boolean) => {
      setValue(next)
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, next ? '1' : '0')
    },
    [key],
  )
  return [value, set]
}
