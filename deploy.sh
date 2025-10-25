#!/bin/bash

# Скрипт развертывания GARANT BETON
set -e

echo "🚀 Начинаем развертывание GARANT BETON..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и повторите попытку."
    exit 1
fi

# Переходим в папку infra
cd infra

# Проверяем наличие .env файла
if [ ! -f "env.production" ]; then
    echo "❌ Файл env.production не найден. Создайте его с необходимыми переменными."
    exit 1
fi

# Копируем env.production в .env для docker-compose
cp env.production .env

echo "📦 Собираем и запускаем контейнеры..."

# Останавливаем существующие контейнеры
docker-compose down --remove-orphans

# Собираем и запускаем контейнеры
docker-compose up --build -d

echo "⏳ Ждем запуска сервисов..."

# Ждем запуска базы данных
echo "🔄 Проверяем базу данных..."
timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U postgres; do sleep 2; done'

# Ждем запуска backend
echo "🔄 Проверяем backend..."
timeout 60 bash -c 'until curl -f http://localhost:4000/api/v1/health; do sleep 2; done'

# Ждем запуска frontend
echo "🔄 Проверяем frontend..."
timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'

echo "✅ Развертывание завершено!"
echo ""
echo "🌐 Приложение доступно по адресам:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:4000"
echo "   Health Check: http://localhost:4000/api/v1/health"
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps


