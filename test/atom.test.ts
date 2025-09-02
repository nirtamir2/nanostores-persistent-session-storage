import './setup.js'

import { delay } from 'nanodelay'
import { cleanStores } from 'nanostores'
import type { WritableAtom } from 'nanostores'
import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, test } from 'node:test'

import {
  persistentAtom,
  type PersistentListener,
  setPersistentEngine,
  windowPersistentEvents
} from '../index.js'
import { emitsessionStorage } from './utils.js'

let atom: WritableAtom<string | undefined>

afterEach(() => {
  sessionStorage.clear()
  cleanStores(atom)
  setPersistentEngine(sessionStorage, windowPersistentEvents)
})

test('loads data from sessionStorage', () => {
  sessionStorage.a = '1'
  atom = persistentAtom('a', '2')
  equal(atom.get(), '1')
})

test('saves to sessionStorage', () => {
  atom = persistentAtom<string | undefined>('b')

  let events: (string | undefined)[] = []
  atom.listen(value => {
    events.push(value)
  })
  equal(atom.get(), undefined)

  atom.set('1')
  deepStrictEqual(sessionStorage, { b: '1' })
  deepStrictEqual(events, ['1'])

  atom.set(undefined)
  deepStrictEqual(sessionStorage, {})
  deepStrictEqual(events, ['1', undefined])
})

test('listens for other tabs', () => {
  atom = persistentAtom('c')

  let events: (string | undefined)[] = []
  atom.listen(value => {
    events.push(value)
  })

  emitsessionStorage('c', '1')

  deepStrictEqual(events, ['1'])
  equal(atom.get(), '1')

  emitsessionStorage('c', null)
  equal(atom.get(), undefined)
})

test('listens for key cleaning', () => {
  atom = persistentAtom('c')

  let events: (string | undefined)[] = []
  atom.listen(value => {
    events.push(value)
  })
  atom.set('init')

  sessionStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', {}))

  deepStrictEqual(events, ['init', undefined])
  equal(atom.get(), undefined)
})

test('ignores other tabs on request', () => {
  atom = persistentAtom('c2', undefined, { listen: false })

  let events: (string | undefined)[] = []
  atom.listen(value => {
    events.push(value)
  })

  emitsessionStorage('c2', '1')

  deepStrictEqual(events, [])
  equal(atom.get(), undefined)
})

test('saves to sessionStorage in disabled state', () => {
  atom = persistentAtom('d')

  atom.set('1')
  equal(sessionStorage.d, '1')

  atom.set(undefined)
  equal(sessionStorage.d, undefined)
})

test('allows to change encoding', () => {
  let locale = persistentAtom('locale', ['en', 'US'], {
    decode: JSON.parse,
    encode: JSON.stringify
  })

  locale.listen(() => {})
  locale.set(['ru', 'RU'])

  deepStrictEqual(sessionStorage.getItem('locale'), '["ru","RU"]')

  emitsessionStorage('locale', '["fr","CA"]')

  deepStrictEqual(locale.get(), ['fr', 'CA'])
  deepStrictEqual(sessionStorage.getItem('locale'), '["fr","CA"]')
})

test('changes engine', () => {
  let storage: Record<string, string> = {}
  let listeners: PersistentListener[] = []
  let events = {
    addEventListener(key: string, callback: PersistentListener) {
      listeners.push(callback)
    },
    removeEventListener(key: string, callback: PersistentListener) {
      listeners = listeners.filter(i => i !== callback)
    }
  }
  setPersistentEngine(storage, events)

  atom = persistentAtom('z')
  atom.listen(() => {})
  atom.set('1')

  equal(listeners.length, 1)
  deepStrictEqual(storage, { z: '1' })

  storage.z = '1a'
  for (let i of listeners) i({ key: 'z', newValue: '1a' })

  equal(atom.get(), '1a')

  atom.set(undefined)
  deepStrictEqual(storage, {})
})

test('supports per key engine', async () => {
  let storage: Record<string, string> = {}
  let listeners: Record<string, PersistentListener> = {}
  setPersistentEngine(storage, {
    addEventListener(key, listener) {
      listeners[key] = listener
    },
    perKey: true,
    removeEventListener(key) {
      delete listeners[key]
    }
  })

  atom = persistentAtom('lang')
  let unbind = atom.listen(() => {})
  deepStrictEqual(Object.keys(listeners), ['lang'])

  atom.set('fr')
  deepStrictEqual(Object.keys(listeners), ['lang'])

  storage.lang = 'es'
  listeners.lang({ key: 'lang', newValue: 'es' })
  equal(atom.get(), 'es')

  unbind()
  await delay(1010)
  deepStrictEqual(Object.keys(listeners), [])
})

test('goes back to initial on key removal', () => {
  atom = persistentAtom('key', 'initial')
  atom.set('1')

  let events: (string | undefined)[] = []
  atom.listen(value => {
    events.push(value)
  })

  emitsessionStorage('key', null)
  deepStrictEqual(events, ['initial'])
  equal(atom.get(), 'initial')
})

test('goes back to initial on key removal with custom stringifier', () => {
  let store = persistentAtom('bool', false, {
    decode(str) {
      return str !== ''
    },
    encode(value) {
      return value ? 'yes' : undefined
    }
  })
  equal(store.get(), false)
  equal(typeof sessionStorage.bool, 'undefined')

  store.set(true)
  equal(sessionStorage.bool, 'yes')

  emitsessionStorage('bool', null)
  equal(store.get(), false)
})
