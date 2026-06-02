FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @chronomint/contracts build
RUN pnpm --filter @chronomint/api prisma:generate
RUN pnpm --filter @chronomint/api build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/node_modules ./root_node_modules
COPY --from=builder /app/apps/api/package.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]
