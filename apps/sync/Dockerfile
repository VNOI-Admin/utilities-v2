FROM node:20-alpine AS builder
RUN apk update

WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN turbo prune --scope=sync --docker

FROM node:20-alpine AS installer
RUN apk update
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/nest-cli.json nest-cli.json
COPY --from=builder /app/turbo.json turbo.json
COPY --from=builder /app/tsconfig.json tsconfig.json
COPY --from=builder /app/tsconfig.build.json tsconfig.build.json

RUN yarn install

RUN yarn turbo run build --filter=sync...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=installer /app .

EXPOSE 8005

USER node

CMD node dist/apps/sync/main.js
