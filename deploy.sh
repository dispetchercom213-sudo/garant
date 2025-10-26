#!/bin/bash

# Скрипт развертывания GARANT BETON
set -e

echo "🚀 Начинаем развертывание GARANT BETON..."

# Функция для ПОЛНОГО удаления aaPanel
remove_aapanel() {
    echo "🗑️  УДАЛЯЕМ AAPANEL ПОЛНОСТЬЮ..."
    
    # Останавливаем все службы
    echo "   ⏹️  Останавливаем службы..."
    sudo /etc/init.d/bt stop 2>/dev/null || true
    sudo systemctl stop bt 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true
    sudo systemctl stop apache2 2>/dev/null || true
    sudo systemctl stop mysql 2>/dev/null || true
    
    # Деинсталлируем aaPanel
    echo "   🗑️  Деинсталлируем aaPanel..."
    if [ -f /etc/init.d/bt ]; then
        sudo /etc/init.d/bt uninstall
    fi
    
    # Удаляем все файлы и директории aaPanel
    echo "   🗑️  Удаляем файлы aaPanel..."
    sudo rm -rf /www
    sudo rm -rf /usr/bin/bt
    sudo rm -f /etc/init.d/bt
    sudo rm -rf /etc/init.d/bt
    sudo rm -rf /tmp/panelLock.pl
    
    # Удаляем конфигурационные файлы
    sudo rm -rf /www/server
    sudo rm -rf /usr/local/aapanel
    sudo rm -rf /etc/systemd/system/bt.service 2>/dev/null || true
    
    # Очищаем порты
    echo "   🔓 Освобождаем порты..."
    sudo fuser -k 80/tcp 2>/dev/null || true
    sudo fuser -k 443/tcp 2>/dev/null || true
    
    echo "✅ aaPanel ПОЛНОСТЬЮ удален!"
}

# Удаляем aaPanel
remove_aapanel

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


