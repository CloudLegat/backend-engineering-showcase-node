import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '@/libs/typeorm/abstract-entity'

@Entity('users')
export class UserEntity extends AbstractEntity {
  @Column({ name: 'balance', type: 'bigint' })
  public readonly balance!: string
}
