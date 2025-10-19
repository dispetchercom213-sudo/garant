# Multi-stage build для оптимизации размера образа

# Stage 1: Backend Builder
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

# Копируем package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci --only=production && \
    npm cache clean --force

# Копируем исходный код
COPY backend/ ./

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN npm run build

# Stage 2: Frontend Builder
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем package files
COPY frontend/package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && \
    npm cache clean --force

# Копируем исходный код
COPY frontend/ ./

# Собираем приложение
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS production

WORKDIR /app

# Устанавливаем dumb-init для правильной обработки сигналов
RUN apk add --no-cache dumb-init

# Создаем non-root пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копируем backend build
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/package*.json ./backend/
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/prisma ./backend/prisma

# Копируем frontend build (опционально, если нужно отдавать статику с бэкенда)
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Переключаемся на non-root пользователя
USER nodejs

# Expose порт
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Используем dumb-init для запуска
ENTRYPOINT ["dumb-init", "--"]

# Запускаем приложение
CMD ["node", "backend/dist/main.js"]

