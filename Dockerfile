# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# ไม่ copy .env เข้า image — ใช้ environment variables แทน
RUN rm -f .env

ENV NODE_ENV=production
ENV PORT=4060

EXPOSE 4060

CMD ["node", "server.js"]
