FROM node:20-alpine AS builder
RUN apk update

WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN turbo prune --scope=admin-panel --docker

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

RUN yarn turbo run build --filter=admin-panel...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN yarn global add http-server

COPY --from=installer /app .

EXPOSE 8000

USER node

CMD ["http-server", "apps/admin-panel/dist", "-p", "8000"]
