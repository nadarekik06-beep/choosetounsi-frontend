'use client'

// Switching language normally remounts the page (root layout) so it refetches API content
// in the new language. A form being filled in (seller product form) holds that remount off:
// the page stays mounted, nothing typed is lost, and the form reloads its own labels.
//
//   useEffect(() => holdLocaleRemount(), [])   // held while the component is mounted

let holds = 0

export function holdLocaleRemount(): () => void {
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds--
  }
}

export function isLocaleRemountHeld(): boolean {
  return holds > 0
}
