import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOutboxEventsTable1000000000004 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "main"."outbox_events_published_at_indx"')
    await queryRunner.query('DROP TABLE "main"."outbox_events"')
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "main"."outbox_events" (
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "event_type" character varying(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "published_at" TIMESTAMP,
        "queue_name" character varying(255) NOT NULL,
        CONSTRAINT "outbox_events_id_pk" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "outbox_events_published_at_indx" ON "main"."outbox_events" ("published_at")',
    )
  }
}
