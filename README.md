# Purchase Service

NestJS microservice demonstrating a marketplace purchase flow with strict Clean Architecture.

## Architecture

The module follows all four Clean Architecture layers:

```
src/modules/purchase/
├── domain/           Pure business objects with invariants (no framework deps)
│   ├── product.ts    Product aggregate - enforces "can only buy available" rule
│   └── user.ts       User aggregate - enforces "balance cannot go negative" rule
├── application/      Use cases, command handlers, ports (interfaces)
├── infrastructure/   TypeORM adapters, outbox relay, RabbitMQ publisher
└── user-interface/   HTTP controller and transport DTOs
```

**Dependency rule**: each layer depends only inward. Infrastructure implements application ports. Domain knows nothing about the framework.

## Key Design Decisions

### Race condition protection

`SELECT ... FOR UPDATE` (pessimistic locking) is acquired on both the product row and the buyer row inside a single database transaction in `PurchaseUnitOfWorkAdapter`. Locking both prevents two concurrent purchases of different products by the same buyer from both passing the balance check on a stale snapshot and driving the balance negative.

Why pessimistic over optimistic? At the expected concurrency level a product can realistically have many simultaneous buyers, and optimistic locking would cause a cascade of retries that degrade UX. Pessimistic locking gives a clear, immediate failure to losers.

### Idempotency

`idempotency-key` header is required. Each purchase transaction first reserves the key in the `idempotency_keys` table. The key row stores a hash of the business request (`buyerId`, `productId`) and is locked with `SELECT ... FOR UPDATE` for duplicate requests.

This makes parallel retries deterministic: concurrent requests with the same key wait for the first transaction and then return the same purchase result. Reusing the same key with a different request payload returns `409`.

### Consistency and the Outbox pattern

All writes (product status, buyer debit, seller credit, purchase record, outbox event) happen in a single transaction. If the transaction commits, all side effects are guaranteed. If it rolls back, nothing is persisted.

The purchase flow attempts an immediate direct publish after commit. If that succeeds, the outbox record is marked published. The `OutboxRelayService` polls for any remaining unpublished events every 5 seconds as a fallback for cases where the direct publish failed. Every publish - both direct and relay - uses RabbitMQ publisher confirms, so an event is only marked published after the broker has durably persisted it.

At-least-once delivery to RabbitMQ is the guarantee, not exactly-once. The consumer must be idempotent. A crash between broker confirm and `markPublished` can cause a re-delivery on the next relay tick. This is an accepted property of outbox-based messaging; deduplication belongs on the consumer side.

### Balance representation

Balances and prices are stored as `BIGINT` (integer cents). This eliminates floating-point rounding errors entirely. The API accepts and returns amounts as decimal strings.

### Production trade-offs

- The outbox relay uses polling. For higher throughput or lower latency, CDC via Debezium/Kafka could replace polling, but that would add operational complexity outside the scope of this showcase.
- Event delivery is at-least-once, not exactly-once. Consumers must deduplicate by `purchaseId`.
- OpenTelemetry tracing would be added in production to observe transaction latency, lock contention, and outbox lag.

## Running locally

```bash
docker compose -f ops/docker/docker-compose.yml up -d --build
```

The Docker PostgreSQL service is intentionally stateless for this showcase. Its data directory is mounted as `tmpfs`, so removing and recreating the stack gives a fresh database with migrations and demo data applied again:

```bash
docker compose -f ops/docker/docker-compose.yml down
docker compose -f ops/docker/docker-compose.yml up -d --build
```

For development without Docker:

```bash
docker compose -f ops/docker/docker-compose.yml up -d postgres rabbitmq
yarn install
yarn dev:start:web
```

## API

```
POST /purchases
Headers:
  idempotency-key: <unique string>
  Content-Type: application/json

Body:
{
  "buyerId": "<uuid>",
  "productId": "<uuid>"
}

Responses:
  200 - purchase created (or idempotent duplicate returned)
  400 - missing or empty idempotency-key header, or invalid UUID in body
  409 - product not available, or idempotency-key was reused with a different payload
  422 - insufficient funds
```

Fresh Docker databases are seeded by migrations with one ready-to-buy demo product, so this request returns `200` immediately after `docker compose -f ops/docker/docker-compose.yml up -d --build`:

```
POST http://localhost:3000/purchases
idempotency-key: demo-purchase-001
Content-Type: application/json

{
  "buyerId": "550e8400-e29b-41d4-a716-446655440001",
  "productId": "550e8400-e29b-41d4-a716-446655440003"
}
```

The first successful request sells the demo product. The same request with the same `idempotency-key` returns the same purchase, demonstrating idempotent retry behavior. A new `idempotency-key` for the same product correctly returns `409`, because the product is already sold.

Swagger UI is available at `http://localhost:3000/api`.

## Tests

```bash
yarn test:unit          # Vitest - domain + command handler specs
yarn test:integration   # Jest + Testcontainers - full flow with real PostgreSQL and RabbitMQ
yarn test:mutation      # Stryker mutation testing
yarn dev:test:coverage  # Unit tests with coverage report
```

The integration test covers:

- Happy path (balance transfer, product status change)
- REST API happy path and HTTP error mapping
- Idempotency (repeated key returns same purchase, only one DB row)
- Parallel idempotency retries with the same key return the same purchase
- Idempotency key reuse with a different payload is rejected
- Product already sold (returns 409)
- Insufficient funds (returns 422)
- Concurrent race on same product (5 parallel requests, exactly one wins)
- Concurrent race by same buyer on different products (balance prevents both from succeeding)

## Linting

```bash
yarn lint:eslint --fix  # ESLint
yarn lint:tsc           # TypeScript strict check
yarn lint:depcheck      # Unused dependencies (knip)
yarn lint:audit         # Security audit
```
