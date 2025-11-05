# Команды для исправления на сервере

## Проблема: конфликт с migrate.sh и nginx.conf не обновлен

Выполните на сервере:

```bash
cd ~/garant-beton

# Сохранить локальные изменения migrate.sh (если нужно)
git stash

# Обновить код
git pull origin main

# Применить изменения nginx.conf
docker-compose restart nginx

# Проверить логи backend для ошибки login
docker-compose logs backend --tail=50 | grep -i error
```

## Если нужно проверить ошибку login в реальном времени:

```bash
# В одном терминале следить за логами
docker-compose logs -f backend

# В другом терминале попробовать залогиниться и смотреть ошибки
```

## Альтернативный вариант (если git stash не нужен):

```bash
cd ~/garant-beton
git checkout migrate.sh
git pull origin main
docker-compose restart nginx
docker-compose restart backend
```

