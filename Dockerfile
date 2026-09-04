FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
# package-lock.json is committed; npm ci keeps dependency resolution reproducible.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN npm ci

FROM deps AS builder
COPY . .
ARG DATABASE_URL=postgresql://lts:lts@localhost:5432/lts_control
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps ./apps
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/scripts ./scripts
RUN chown node:node /app
USER node
EXPOSE 3000
CMD ["sh","-c","npm run db:push && npm run start"]
