export function emitsessionStorage(key: string, newValue: null | string): void {
  if (newValue === null) {
    delete sessionStorage[key]
  } else {
    sessionStorage[key] = newValue
  }
  global.window.dispatchEvent(
    new global.StorageEvent('storage', { key, newValue })
  )
}
