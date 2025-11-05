# Инструкция по исправлению ошибок на сервере

## Проблемы:
1. `favicon.ico: 403 Forbidden` - исправлено в nginx.conf
2. `login: 500 Internal Server Error` - нужно применить миграции

## Шаги для исправления:

### 1. Обновить nginx.conf на сервере
```bash
ssh ubuntu@78.40.109.177
cd ~/garant-beton
git pull origin main
# nginx.conf уже монтируется как volume, просто перезапустим nginx
docker-compose restart nginx
```

### 2. Применить миграции базы данных
```bash
cd ~/garant-beton
./migrate.sh
```

Или вручную:
```bash
docker-compose exec -T backend sh -c "cd /app && npx prisma migrate deploy"
docker-compose exec -T backend sh -c "cd /app && npx prisma generate"
docker-compose restart backend
```

### 3. Проверить логи backend
```bash
docker-compose logs backend --tail=50
```

### 4. Проверить статус контейнеров
```bash
docker-compose ps
```

### 5. Перезапустить все сервисы (если нужно)
```bash
docker-compose restart
```

## Проверка:
После выполнения команд:
1. Откройте браузер и проверьте, что favicon.ico больше не выдает 403
2. Попробуйте залогиниться - ошибка 500 должна исчезнуть

