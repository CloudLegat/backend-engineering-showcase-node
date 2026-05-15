import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export abstract class AbstractEntity {
  @CreateDateColumn({ type: 'timestamp without time zone' })
  public readonly createdAt!: Date

  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string

  @UpdateDateColumn({ type: 'timestamp without time zone' })
  public readonly updatedAt!: Date
}
