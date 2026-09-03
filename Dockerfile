FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN npm install

FROM deps AS builder
COPY . .
ARG DATABASE_URL=postgresql://lts:lts@localhost:5432/lts_control
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["sh","-c","npm run db:push && npm run start"]
