#!/bin/bash

# Скрипт развертывания GARANT BETON
set -e

echo "🚀 Начинаем развертывание GARANT BETON..."

# Функция для остановки и удаления aaPanel
stop_aapanel() {
    echo "🛑 Останавливаем aaPanel..."
    
    # Останавливаем Nginx
    if systemctl is-active --quiet bt; then
        sudo /etc/init.d/bt stop
        echo "   ✓ aaPanel Nginx остановлен"
    fi
    
    # Останавливаем Apache если установлен
    if systemctl is-active --quiet apache2; then
        sudo systemctl stop apache2
        sudo systemctl disable apache2
        echo "   ✓ Apache остановлен"
    fi
    
    # Останавливаем Nginx если работает как сервис
    if systemctl is-active --quiet nginx; then
        sudo systemctl stop nginx
        sudo systemctl disable nginx
        echo "   ✓ Nginx остановлен"
    fi
    
    echo "✅ aaPanel остановлен"
}

# Останавливаем aaPanel
stop_aapanel

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и повторите попытку."
    exit 1
fi

# Настраиваем DNS для Docker если нужно
if [ ! -f /etc/docker/daemon.json ]; then
    echo "⚙️  Настраиваем DNS для Docker..."
    sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "dns": ["1.1.1.1", "8.8.8.8"],
  "default-address-pools": [{"base": "172.17.0.0/16", "size": 24}]
}
EOF'
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    echo "   ✓ DNS настроен"
fi

echo "📦 Собираем и запускаем контейнеры..."

# Собираем и запускаем контейнеры
docker-compose build --no-cache

docker-compose up -d

echo "⏳ Ждем запуска сервисов..."

# Ждем запуска базы данных
echo "🔄 Проверяем базу данных..."
timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U postgres 2>/dev/null; do sleep 2; done'

# Ждем запуска backend
echo "🔄 Проверяем backend..."
timeout 60 bash -c 'until curl -f http://localhost:4000/api/v1/health 2>/dev/null; do sleep 2; done'

echo "✅ Развертывание завершено!"
echo ""
echo "🌐 Приложение доступно по адресам:"
echo "   Frontend: http://78.40.109.177"
echo "   Backend API: http://78.40.109.177/api/v1"
echo "   Health Check: http://78.40.109.177/api/v1/health"
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps


