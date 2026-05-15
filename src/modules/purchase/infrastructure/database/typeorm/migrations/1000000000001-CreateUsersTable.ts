import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUsersTable1000000000001 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "main"."users"')
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "main"."users" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "balance" bigint NOT NULL DEFAULT 0,
        CONSTRAINT "users_id_pk" PRIMARY KEY ("id")
      )
    `)
  }
}
