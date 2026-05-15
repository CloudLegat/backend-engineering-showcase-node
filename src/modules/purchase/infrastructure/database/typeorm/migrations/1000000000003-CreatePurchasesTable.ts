import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePurchasesTable1000000000003 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "main"."purchases_idempotency_key_uk"')
    await queryRunner.query('DROP TABLE "main"."purchases"')
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "main"."purchases" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "amount" bigint NOT NULL,
        "buyer_id" uuid NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "product_id" uuid NOT NULL,
        "request_hash" character varying(64) NOT NULL,
        "seller_id" uuid NOT NULL,
        CONSTRAINT "purchases_id_pk" PRIMARY KEY ("id"),
        CONSTRAINT "purchases_buyer_id_users_id_fk"
          FOREIGN KEY ("buyer_id") REFERENCES "main"."users" ("id")
          ON UPDATE NO ACTION ON DELETE RESTRICT,
        CONSTRAINT "purchases_product_id_products_id_fk"
          FOREIGN KEY ("product_id") REFERENCES "main"."products" ("id")
          ON UPDATE NO ACTION ON DELETE RESTRICT,
        CONSTRAINT "purchases_seller_id_users_id_fk"
          FOREIGN KEY ("seller_id") REFERENCES "main"."users" ("id")
          ON UPDATE NO ACTION ON DELETE RESTRICT
      )
    `)
    await queryRunner.query(
      'CREATE UNIQUE INDEX "purchases_idempotency_key_uk" ON "main"."purchases" ("idempotency_key")',
    )
  }
}
