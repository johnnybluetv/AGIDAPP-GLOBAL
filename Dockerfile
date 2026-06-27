# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the application (Vite build + esbuild compilation of server)
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package configuration
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
