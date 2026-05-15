import { describe, expect, it } from 'vitest'

import { ProductNotAvailableError } from '@/modules/purchase/application/errors/product-not-available.error'
import { Product, ProductStatus } from '@/modules/purchase/domain/product'

const makeProduct = (status = ProductStatus.Available): Product =>
  new Product('prod-1', BigInt(10000), 'seller-1', status)

describe('Product', () => {
  it('is available when status is Available', () => {
    const product = makeProduct(ProductStatus.Available)

    expect(product.isAvailable()).toBe(true)
  })

  it('is not available when status is Sold', () => {
    const product = makeProduct(ProductStatus.Sold)

    expect(product.isAvailable()).toBe(false)
  })

  it('changes status to Sold on purchase()', () => {
    const product = makeProduct()
    product.purchase()

    expect(product.status).toBe(ProductStatus.Sold)
    expect(product.isAvailable()).toBe(false)
  })

  it('throws ProductNotAvailableError when purchasing an already sold product', () => {
    const product = makeProduct(ProductStatus.Sold)

    expect(() => { product.purchase() }).toThrow(ProductNotAvailableError)
  })

  it('cannot be purchased twice', () => {
    const product = makeProduct()
    product.purchase()

    expect(() => { product.purchase() }).toThrow(ProductNotAvailableError)
  })
})
