# Руководство по развертыванию на Render

## Автоматическое развертывание

Проект настроен для автоматического развертывания через файл `render.yaml`.

### Шаги для развертывания:

1. **Войдите в Render**: https://render.com
2. **Создайте новый Blueprint** из вашего GitHub репозитория
3. **Настройте переменные окружения** для backend:

### Обязательные переменные окружения для Backend:

```
DATABASE_URL=postgresql://user:password@host:5432/garant_beton
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
PORT=4000
```

### Переменные окружения для Frontend:

```
VITE_API_URL=https://garant-beton-backend.onrender.com
```

## Структура проекта

Проект имеет монорепозиторий структуру:
- `/backend` - NestJS API
- `/frontend` - React + Vite приложение

## После развертывания

1. Дождитесь успешного развертывания базы данных
2. Скопируйте `DATABASE_URL` из настроек БД в переменные backend
3. Backend автоматически выполнит миграции при запуске
4. Фронтенд будет доступен как статический сайт

## Настройка БД

Render автоматически создаст PostgreSQL базу данных. Миграции Prisma выполнятся автоматически при сборке backend.

### Заполнение начальными данными

После первого развертывания выполните seed:
1. Откройте Shell в Render для backend сервиса
2. Выполните: `npm run prisma:seed`

## Мониторинг

- Backend health check: `https://your-backend.onrender.com/api/v1/health`
- Frontend: `https://your-frontend.onrender.com`

## Бесплатный план Render

⚠️ **Важно**: Бесплатные сервисы Render "засыпают" после 15 минут неактивности и требуют 30-60 секунд для "пробуждения" при первом запросе.

## Альтернативная настройка (вручную)

Если автоматическое развертывание через Blueprint не работает:

### 1. Backend (Web Service):
- **Build Command**: `cd backend && npm install && npx prisma generate && npm run build`
- **Start Command**: `cd backend && npm run start:prod`
- **Root Directory**: оставьте пустым или укажите `/`

### 2. Frontend (Static Site):
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/dist`
- **Root Directory**: оставьте пустым или укажите `/`

### 3. Database (PostgreSQL):
- Создайте новую PostgreSQL базу
- Скопируйте Internal Database URL
- Добавьте как `DATABASE_URL` в backend

## CORS настройки

Убедитесь, что в backend правильно настроен CORS для вашего frontend домена.

