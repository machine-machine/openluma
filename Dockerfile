# Self-hosted image (Coolify). Vercel deploys don't use this file.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g bun@1.3.13
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_TELEMETRY_DISABLED=1
# The build imports server modules that require these; real values come at runtime.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only BETTER_AUTH_URL=$NEXT_PUBLIC_APP_URL \
    bun run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN npm install -g bun@1.3.13
COPY --from=build /app ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "bun scripts/migrate.ts && exec node_modules/.bin/next start -p ${PORT}"]
