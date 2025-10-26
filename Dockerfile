# Production Backend
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

# Копируем уже собранные файлы
COPY backend/dist ./backend/dist
COPY backend/node_modules ./backend/node_modules
COPY backend/prisma ./backend/prisma
COPY backend/package*.json ./backend/

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/main.js"]

