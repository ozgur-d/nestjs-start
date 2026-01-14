# Multi-stage Dockerfile for NestJS with Fastify
# Stage 1: Dependencies
FROM node:22.22.0-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Stage 2: Build
FROM node:22.22.0-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./

# Copy configuration files
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 3: Production
FROM node:22.22.0-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy only production dependencies
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy only dist folder and necessary files
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Create public directories for uploads and assets
RUN mkdir -p /app/public/uploads /app/public/assets && \
    chown -R nestjs:nodejs /app/public

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 5656

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:5656/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
