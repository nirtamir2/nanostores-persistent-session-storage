import { deepStrictEqual, equal } from 'node:assert'
import { test } from 'node:test'

import { persistentAtom, persistentMap } from '../index.js'

test('works without sessionStorage for map', () => {
  let map = persistentMap<{ one?: string; two?: string }>('a:', {
    one: '1'
  })
  map.listen(() => {})
  map.setKey('two', '2')
  deepStrictEqual(map.get(), { one: '1', two: '2' })
})

test('works without sessionStorage for atom', () => {
  let store = persistentAtom<string>('a', '1')
  store.listen(() => {})
  store.set('2')
  equal(store.get(), '2')
})
