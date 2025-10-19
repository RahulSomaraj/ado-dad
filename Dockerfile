# Multi-stage build for NestJS application
FROM node:20.19.1-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20.19.1-alpine AS production

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Create app user with specific UID/GID for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy any additional files needed (if they exist)
RUN mkdir -p ./public || true

# Create health check file with configurable port
RUN echo 'const http = require("http"); const port = process.env.APP_CONFIG__BACKEND_PORT || 3000; const options = { hostname: "localhost", port: port, path: "/ads", method: "GET", timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on("error", () => process.exit(1)); req.on("timeout", () => process.exit(1)); req.end();' > healthcheck.js

# Switch to non-root user
USER nestjs

# Expose port (configurable via environment variable)
EXPOSE 3000

# Add labels for better container management
LABEL maintainer="ado-dad-team" \
      version="1.0" \
      description="Ado-dad NestJS Application"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init for proper signal handling and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"] 