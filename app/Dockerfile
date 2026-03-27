# Stage 1: Build React Project
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy project files
COPY . .

# Build Vite application (frontend)
RUN npm run build

# Stage 2: Production Server (Vite Preview mode with middlewares)
FROM node:22-alpine

WORKDIR /app

# Copy package config and install only production dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy built frontend dist
COPY --from=builder /app/dist ./dist

# Copy backend plugins and configuration needed for preview server
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/data ./data
COPY --from=builder /app/vite.config.js ./vite.config.js

# Expose port (can be overridden by docker-compose)
EXPOSE 5181

# Enable legacy OpenSSL provider for NTLM auth (required by @marsaud/smb2)
ENV NODE_OPTIONS=--openssl-legacy-provider

# Run Vite in preview mode
CMD ["npm", "run", "preview"]
