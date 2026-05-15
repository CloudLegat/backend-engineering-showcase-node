################################
### Base
################################
FROM node:24.6.0-alpine3.22 AS base

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV YARN_VERSION=4.12.0

RUN corepack enable \
  && yarn set version ${YARN_VERSION}

################################
### Build
################################
FROM base AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY .swcrc eslint.config.mjs jest.config.ts nest-cli.json ormconfig.ts stryker.conf.json tsconfig.json tsconfig.build.json vitest.config.mts ./
COPY src ./src

RUN yarn build

################################
### Application
################################
FROM base AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.swcrc ./.swcrc
COPY --from=builder /app/eslint.config.mjs ./eslint.config.mjs
COPY --from=builder /app/jest.config.ts ./jest.config.ts
COPY --from=builder /app/nest-cli.json ./nest-cli.json
COPY --from=builder /app/ormconfig.ts ./ormconfig.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/stryker.conf.json ./stryker.conf.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=builder /app/vitest.config.mts ./vitest.config.mts

RUN echo "nodeLinker: node-modules" > /app/.yarnrc.yml \
  && chown node:node -R /app/

USER node:node

CMD ["node", "dist/src/web.js"]
