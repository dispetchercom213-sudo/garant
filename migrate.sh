#!/bin/bash
set -e

echo "🔄 Применяем миграции базы данных..."

cd ~/garant-beton

# Применяем миграции
docker-compose exec -T backend sh -c "cd /app && npx prisma migrate deploy --schema=./backend/prisma/schema.prisma"

echo "✅ Миграции применены!"

# Перезапускаем backend
docker-compose restart backend

echo "🚀 Backend перезапущен!"
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps


