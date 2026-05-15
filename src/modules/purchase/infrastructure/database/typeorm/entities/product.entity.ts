import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '@/libs/typeorm/abstract-entity'
import { ProductStatus } from '@/modules/purchase/domain/product'

@Entity('products')
export class ProductEntity extends AbstractEntity {
  @Column({ name: 'price', type: 'bigint' })
  public readonly price!: string

  @Column({ name: 'seller_id', type: 'uuid' })
  public readonly sellerId!: string

  @Column({ default: ProductStatus.Available, length: 20, name: 'status', type: 'varchar' })
  public readonly status!: ProductStatus
}
