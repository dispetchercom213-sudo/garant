# Исправление ошибки 500 на /dashboard

## Проблема
Ошибка 500 на `/dashboard` - это фронтенд-роут, который должен обслуживаться через nginx.

## Проверка на сервере

```bash
ssh ubuntu@78.40.109.177
cd ~/garant-beton

# 1. Проверить логи nginx для запроса /dashboard
docker-compose logs nginx --tail=50 | grep -i dashboard

# 2. Проверить права доступа на frontend/dist
ls -la frontend/dist/index.html
sudo chmod -R 755 frontend/dist
sudo chown -R ubuntu:ubuntu frontend/dist

# 3. Проверить, что nginx видит файлы
docker-compose exec nginx ls -la /usr/share/nginx/html/index.html

# 4. Если файлов нет или права неправильные, исправить внутри контейнера
docker-compose exec nginx chmod -R 755 /usr/share/nginx/html/

# 5. Перезапустить nginx
docker-compose restart nginx

# 6. Проверить конфигурацию nginx на ошибки
docker-compose exec nginx nginx -t
```

## Если проблема сохраняется

Возможно, проблема в том, что nginx пытается обработать `/dashboard` как файл. Проверьте логи:

```bash
docker-compose logs nginx --tail=100 | grep -A 5 -B 5 "500\|error\|dashboard"
```

## Быстрое решение

```bash
# На сервере
cd ~/garant-beton
sudo chmod -R 755 frontend/dist
sudo chown -R ubuntu:ubuntu frontend/dist
docker-compose restart nginx
```

