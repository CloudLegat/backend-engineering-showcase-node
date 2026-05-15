import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateIdempotencyKeysTable1000000000005 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "main"."idempotency_keys_idempotency_key_uk"')
    await queryRunner.query('DROP TABLE "main"."idempotency_keys"')
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "main"."idempotency_keys" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "idempotency_key" character varying(255) NOT NULL,
        "purchase_id" uuid,
        "request_hash" character varying(64) NOT NULL,
        CONSTRAINT "idempotency_keys_id_pk" PRIMARY KEY ("id"),
        CONSTRAINT "idempotency_keys_purchase_id_purchases_id_fk"
          FOREIGN KEY ("purchase_id") REFERENCES "main"."purchases" ("id")
          ON UPDATE NO ACTION ON DELETE RESTRICT
      )
    `)
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idempotency_keys_idempotency_key_uk" ON "main"."idempotency_keys" ("idempotency_key")',
    )
  }
}
