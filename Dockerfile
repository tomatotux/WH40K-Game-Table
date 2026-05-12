FROM node:20-alpine

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application source
COPY src/ ./src/

# Create data directory for SQLite DB and map uploads
RUN mkdir -p /app/data/maps && chmod 755 /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start server
CMD ["node", "src/server.js"]
