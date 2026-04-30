FROM node:20-alpine AS base

# Create non-root user
RUN addgroup -S plume && adduser -S plume -G plume

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Change ownership to plume user
RUN chown -R plume:plume /app

# Switch to non-root user
USER plume

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
