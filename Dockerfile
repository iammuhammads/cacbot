# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM mcr.microsoft.com/playwright:v1.51.1-jammy

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
# We install playwright here again as the base image has the browsers but we need the client
RUN npm install --omit=dev

# Playwright image already has browsers installed at /ms-playwright
# We just need to make sure our code knows where they are (usually automatic)

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

# Start command (defaults to app, can be overridden for worker)
CMD ["node", "dist/index.js"]
