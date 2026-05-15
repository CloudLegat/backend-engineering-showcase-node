import { describe, expect, it } from 'vitest'

import { InsufficientFundsError } from '@/modules/purchase/application/errors/insufficient-funds.error'
import { User } from '@/modules/purchase/domain/user'

const makeUser = (balance = BigInt(10000)): User => new User('user-1', balance)

describe('User', () => {
  it('can afford amount within balance', () => {
    const user = makeUser(BigInt(10000))

    expect(user.canAfford(BigInt(5000))).toBe(true)
    expect(user.canAfford(BigInt(10000))).toBe(true)
  })

  it('cannot afford amount exceeding balance', () => {
    const user = makeUser(BigInt(5000))

    expect(user.canAfford(BigInt(5001))).toBe(false)
  })

  it('reduces balance on debit()', () => {
    const user = makeUser(BigInt(10000))
    user.debit(BigInt(3000))

    expect(user.balance).toBe(BigInt(7000))
  })

  it('throws InsufficientFundsError when debiting more than balance', () => {
    const user = makeUser(BigInt(5000))

    expect(() => { user.debit(BigInt(5001)) }).toThrow(InsufficientFundsError)
  })

  it('does not change balance on failed debit', () => {
    const user = makeUser(BigInt(5000))

    try {
      user.debit(BigInt(9999))
    } catch {
      // expected
    }

    expect(user.balance).toBe(BigInt(5000))
  })

  it('increases balance on credit()', () => {
    const user = makeUser(BigInt(5000))
    user.credit(BigInt(3000))

    expect(user.balance).toBe(BigInt(8000))
  })
})
