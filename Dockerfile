FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN npm ci || npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "build/index.js"]
