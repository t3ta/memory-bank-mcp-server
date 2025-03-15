FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Clean up dev dependencies
RUN npm prune --production

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
