import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateProductsTable1000000000002 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "main"."products"')
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "main"."products" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "price" bigint NOT NULL,
        "seller_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'available',
        CONSTRAINT "products_id_pk" PRIMARY KEY ("id"),
        CONSTRAINT "products_seller_id_users_id_fk"
          FOREIGN KEY ("seller_id") REFERENCES "main"."users" ("id")
          ON UPDATE NO ACTION ON DELETE RESTRICT
      )
    `)
    await queryRunner.query('CREATE INDEX "products_status_indx" ON "main"."products" ("status")')
  }
}
