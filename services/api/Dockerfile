# Multi-stage build for production
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY services/api ./services/api

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Build API
WORKDIR /app/services/api
RUN pnpm build

# Generate Prisma Client
RUN npx prisma generate

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api/package.json ./services/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from base stage
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/services/api/dist ./services/api/dist
COPY --from=base /app/services/api/prisma ./services/api/prisma
COPY --from=base /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma

# Set working directory to API
WORKDIR /app/services/api

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/services/api/src/main.js"]
