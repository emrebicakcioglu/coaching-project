# ======================================
# Core Application Frontend - Dockerfile
# ======================================
# Multi-stage build for React/Vite frontend
#
# Stage 1: Build - Compiles TypeScript and builds production assets
# Stage 2: Production - Serves static files with nginx
#
# Usage:
#   docker build -t core-app-frontend ./frontend
#   docker run -p 3000:80 core-app-frontend
#
# ======================================

# ----------------
# Stage 1: Build
# ----------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies using npm install (not ci) to properly resolve platform-specific rollup binaries
# The package-lock.json may have Windows-specific deps that don't work on Linux
RUN npm install --ignore-scripts=false

# Copy source code
COPY . .

# Ensure no stale cache interferes with build
RUN rm -rf node_modules/.cache node_modules/.vite

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:14102/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# ----------------
# Stage 2: Production
# ----------------
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check - use dedicated /health endpoint from nginx.conf
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
