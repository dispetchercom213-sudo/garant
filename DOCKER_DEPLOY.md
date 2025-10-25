# Развёртывание через Docker

## Шаги развёртывания

### 1. Остановите текущие службы

```bash
# Остановите PM2
cd /www/wwwroot/gar-ant-bet-on.ru/backend
pm2 stop garant-beton-backend
pm2 delete garant-beton-backend

# Остановите существующие Docker контейнеры
cd /www/wwwroot/gar-ant-bet-on.ru
docker-compose down -v
```

### 2. Перезагрузите сервер

```bash
sudo reboot
```

### 3. Создайте директорию для проекта

```bash
mkdir -p /root/garant-beton
cd /root/garant-beton
```

### 4. Клонируйте или загрузите проект

Если есть Git:
```bash
git clone <repository-url> .
```

Или загрузите файлы вручную через SCP.

### 5. Соберите и запустите через Docker

```bash
# Остановите aaPanel Nginx (он конфликтует с портом 80)
sudo systemctl stop nginx

# Соберите образы
docker-compose build --no-cache

# Запустите контейнеры
docker-compose up -d

# Проверьте логи
docker-compose logs -f
```

### 6. Примените миграции БД

```bash
docker-compose exec backend npx prisma migrate deploy
```

### 7. Проверьте статус

```bash
# Проверьте контейнеры
docker-compose ps

# Проверьте доступность
curl http://localhost/
curl http://localhost/api/v1/health
```

### 8. Настройте автозапуск при перезагрузке

```bash
# Docker автоматически запускается с флагом restart: unless-stopped
# Проверьте:
docker-compose ps
```

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f db

# Перезапуск службы
docker-compose restart backend

# Остановка всех контейнеров
docker-compose down

# Остановка с удалением данных БД
docker-compose down -v
```
