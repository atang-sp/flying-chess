FROM node:24-alpine AS build

WORKDIR /app
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY apps/room-server/package.json apps/room-server/package.json
COPY packages/game-core/package.json packages/game-core/package.json
RUN npm ci --ignore-scripts

COPY apps/room-server apps/room-server
COPY packages/game-core packages/game-core
COPY src src
COPY tsconfig.json ./
RUN npm run build:room-server

FROM node:24-alpine

ARG ROOM_SERVER_VERSION=dev
ARG ROOM_SERVER_BUILD_SHA=unknown

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    ALLOWED_ORIGINS=https://atang-sp.github.io \
    ROOM_SERVER_VERSION=${ROOM_SERVER_VERSION} \
    ROOM_SERVER_BUILD_SHA=${ROOM_SERVER_BUILD_SHA} \
    ROOM_DRAIN_TIMEOUT_MS=1800000

COPY --from=build --chown=node:node /app/apps/room-server/dist/server.mjs /app/server.mjs
COPY --from=build --chown=node:node /app/node_modules/ws /app/node_modules/ws

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/health >/dev/null || exit 1

CMD ["node", "/app/server.mjs"]
