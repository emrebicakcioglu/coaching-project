# ======================================
# Core Application Backend - Dockerfile
# ======================================
# Multi-stage build for Node.js TypeScript application
# Stories:
#   - STORY-012: Environment Configuration
#   - STORY-021A: API-Basis-Infrastruktur (NestJS Setup)
#   - STORY-023A: E-Mail Service Setup (Resend.com)
#   - STORY-018A: i18n Translations
#   - STORY-038A: Feedback-Backend API
#   - STORY-038B: Feedback Rate Limiting & Email Queue

# ----------------
# Build Stage
# ----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy NestJS CLI configuration
COPY nest-cli.json ./

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Copy locales directory (STORY-018A: i18n translations)
COPY locales ./locales

# Build TypeScript using NestJS CLI
RUN npm run build

# ----------------
# Production Stage
# ----------------
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration SQL files (not compiled by TypeScript)
COPY --from=builder /app/src/database/migrations ./dist/database/migrations

# Copy email templates (STORY-023A)
COPY templates ./templates

# Create logs directory and set ownership for writable directories
RUN mkdir -p logs && chown -R nodejs:nodejs logs && \
    chown -R nodejs:nodejs dist

# Switch to non-root user
USER nodejs

# Expose application port (STORY-023A: Corrected to match docker-compose.yml)
EXPOSE 14102

# Health check - Using /api/health endpoint (STORY-021A, STORY-029)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:14102/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start NestJS application
CMD ["node", "dist/main.js"]
