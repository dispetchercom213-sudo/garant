# Backend
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install --timeout=600000 --fetch-retry-mintimeout=30000 --fetch-retries=10

COPY backend/ ./

RUN npx prisma generate
RUN npm run build

# Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install --timeout=600000 --fetch-retry-mintimeout=30000 --fetch-retries=10

COPY frontend/ ./

RUN npm run build

# Production Backend
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/main.js"]

