FROM node:20-alpine AS builder
RUN apk update

WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN apk add --no-cache jq && rm -rf /var/cache/apk/*
RUN jq 'to_entries | map_values({(.key) : ("$" + .key) }) | reduce .[] as $item ({}; . + $item)' ./apps/admin-panel/config/config.json > ./apps/admin-panel/config/config.tmp.json && mv ./apps/admin-panel/config/config.tmp.json ./apps/admin-panel/config/config.json

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

FROM nginx:alpine AS server
ENV JSFOLDER=/usr/share/nginx/html/assets/*.js

RUN apk update && apk add moreutils

COPY ./apps/admin-panel/nginx.conf /etc/nginx/conf.d/nginx.conf
RUN rm /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html/*

COPY ./apps/admin-panel/nginx.sh /usr/bin/nginx.sh
RUN chmod +x /usr/bin/nginx.sh
WORKDIR /usr/share/nginx/html
COPY --from=installer /app/apps/admin-panel/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT [ "nginx.sh" ]
