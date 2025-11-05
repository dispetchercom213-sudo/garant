# Инструкция по загрузке модуля notifications на сервер

## Проблема
Модуль notifications не загружен на сервер, поэтому эндпоинт `/api/v1/notifications/unread-count` возвращает 404.

**ВАЖНО:** После загрузки файлов **обязательно перезапустите backend**, иначе изменения не вступят в силу!

## Решение

### Вариант 1: Загрузить только папку notifications (быстрее)

На **локальной машине** (Windows):

```bash
cd C:\Users\ADMIN\Desktop\projekt\GGG
scp -r backend\dist\notifications ubuntu@78.40.109.177:~/garant-beton/backend/dist/
```

### Вариант 2: Загрузить весь backend/dist (если нужно обновить всё)

На **локальной машине** (Windows):

```bash
cd C:\Users\ADMIN\Desktop\projekt\GGG
scp -r backend\dist ubuntu@78.40.109.177:~/garant-beton/backend/
```

### После загрузки на сервере:

```bash
# Подключиться к серверу
ssh ubuntu@78.40.109.177

# Перейти в директорию проекта
cd ~/garant-beton

# Проверить, что файлы загружены
ls -la backend/dist/notifications/

# Должны быть файлы:
# - notifications.controller.js
# - notifications.module.js
# - notifications.service.js
# - и соответствующие .d.ts и .js.map файлы

# ВАЖНО: Перезапустить backend (без этого роуты не появятся!)
docker-compose restart backend

# Подождать 5-10 секунд для запуска
sleep 5

# Проверить логи - должны появиться роуты notifications
docker-compose logs backend --tail=200 | grep -i notifications

# Должны увидеть строки вида:
# [Nest] ... LOG [RoutesResolver] NotificationsController {/api/v1/notifications}: ...
# [Nest] ... LOG [RouterExplorer] Mapped {/api/v1/notifications, GET} route
# [Nest] ... LOG [RouterExplorer] Mapped {/api/v1/notifications/unread-count, GET} route
```

## Ожидаемый результат

После перезапуска в логах должны появиться строки вида:
```
[Nest] ... LOG [RouterExplorer] Mapped {/api/v1/notifications, GET} route
[Nest] ... LOG [RouterExplorer] Mapped {/api/v1/notifications/unread-count, GET} route
```

И ошибка 404 на `/api/v1/notifications/unread-count` должна исчезнуть.

