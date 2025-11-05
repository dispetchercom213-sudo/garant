#!/bin/bash

# Быстрое развертывание GARANT BETON

echo "🚀 Быстрое развертывание GARANT BETON..."

# Создаем папку если её нет
mkdir -p /home/ubuntu/garant-beton
cd /home/ubuntu/garant-beton

# Если папка пустая - клонируем
if [ ! -f "docker-compose.yml" ]; then
    echo "📦 Клонируем проект..."
    git clone https://github.com/dispetchercom213-sudo/garant.git .
fi

# Создаем .env файлы
echo "⚙️  Создаем конфигурацию..."
cat > backend/.env << 'EOF'
DB_PASSWORD=DMpydJOsv3NYt8Ef0eX6NR4=
JWT_SECRET=garant-beton-super-secret-jwt-key-2025-production-min-32-chars
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://gar-ant-bet-on.ru,http://gar-ant-bet-on.ru,https://www.gar-ant-bet-on.ru,http://www.gar-ant-bet-on.ru,http://78.40.109.177
ORS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU5MDVhYjg1MDEzOTRjNjZiYTdlMGQyZjk3YmU3YjZlIiwiaCI6Im11cm11cjY0In0=
DATABASE_URL=postgresql://postgres:DMpydJOsv3NYt8Ef0eX6NR4=@db:5432/garant_beton?schema=public
EOF

echo 'VITE_API_URL=/api/v1' > frontend/.env

# Освобождаем порты
echo "🔓 Освобождаем порты..."
sudo fuser -k 80/tcp 2>/dev/null || true
sudo fuser -k 443/tcp 2>/dev/null || true

# Запускаем Docker
echo "🐳 Запускаем Docker..."
chmod +x deploy.sh
sudo ./deploy.sh

echo "✅ Готово!"


