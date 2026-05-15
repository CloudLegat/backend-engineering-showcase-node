import type { MigrationInterface, QueryRunner } from 'typeorm'

const DEMO_BUYER_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEMO_SELLER_ID = '550e8400-e29b-41d4-a716-446655440002'
const DEMO_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440003'

export class SeedDemoPurchaseData1000000000006 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM "main"."idempotency_keys"
        WHERE "purchase_id" IN (
          SELECT "id"
          FROM "main"."purchases"
          WHERE "product_id" = $1
        )
      `,
      [DEMO_PRODUCT_ID],
    )
    await queryRunner.query('DELETE FROM "main"."outbox_events" WHERE "payload" ->> \'productId\' = $1', [
      DEMO_PRODUCT_ID,
    ])
    await queryRunner.query('DELETE FROM "main"."purchases" WHERE "product_id" = $1', [DEMO_PRODUCT_ID])
    await queryRunner.query('DELETE FROM "main"."products" WHERE "id" = $1', [DEMO_PRODUCT_ID])
    await queryRunner.query('DELETE FROM "main"."users" WHERE "id" IN ($1, $2)', [DEMO_BUYER_ID, DEMO_SELLER_ID])
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO "main"."users" ("id", "balance")
        VALUES
          ($1, 100000),
          ($2, 0)
        ON CONFLICT ("id") DO UPDATE
        SET "balance" = EXCLUDED."balance"
      `,
      [DEMO_BUYER_ID, DEMO_SELLER_ID],
    )
    await queryRunner.query(
      `
        INSERT INTO "main"."products" ("id", "price", "seller_id", "status")
        VALUES ($1, 10000, $2, 'available')
        ON CONFLICT ("id") DO UPDATE
        SET
          "price" = EXCLUDED."price",
          "seller_id" = EXCLUDED."seller_id",
          "status" = EXCLUDED."status"
      `,
      [DEMO_PRODUCT_ID, DEMO_SELLER_ID],
    )
  }
}
