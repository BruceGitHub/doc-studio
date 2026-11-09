# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g pnpm@12.18.0

# Install dependencies first so this layer is cached while sources change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/server packages/server
COPY packages/cli packages/cli
COPY packages/web packages/web
RUN pnpm exec tsc -b \
  && chmod +x packages/cli/dist/index.js \
  && pnpm --filter @docstudio/web build

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# iptables lets the entrypoint cut every outbound connection from the container;
# su-exec drops the server process from root to the unprivileged node user.
RUN apk add --no-cache iptables su-exec

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN npm install -g pnpm@12.18.0 \
  && pnpm install --prod --frozen-lockfile --ignore-scripts \
  && npm uninstall -g pnpm

COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/cli/dist packages/cli/dist
COPY --from=build /app/packages/web/dist packages/web/dist

COPY docker/entrypoint.sh /usr/local/bin/docstudio-entrypoint
RUN chmod 755 /usr/local/bin/docstudio-entrypoint

EXPOSE 4321

ENTRYPOINT ["/usr/local/bin/docstudio-entrypoint"]
CMD ["serve", "/vault", "--host", "0.0.0.0", "--port", "4321"]
