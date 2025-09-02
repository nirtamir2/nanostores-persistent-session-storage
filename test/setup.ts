import { Window } from 'happy-dom'

let window = new Window()
global.window = window as any
global.StorageEvent = window.StorageEvent as any

global.sessionStorage = {} as any
Object.defineProperty(sessionStorage, 'getItem', {
  enumerable: false,
  value(key: string) {
    return sessionStorage[key] || null
  }
})
Object.defineProperty(global.sessionStorage, 'setItem', {
  enumerable: false,
  value(key: string, value: null | string) {
    sessionStorage[key] = `${value}`
  }
})
Object.defineProperty(sessionStorage, 'clear', {
  enumerable: false,
  value() {
    Object.keys(sessionStorage).map(key => delete sessionStorage[key])
  }
})

Object.defineProperty(global, '_sessionStorage', {
  value: global.sessionStorage,
  writable: false
})
