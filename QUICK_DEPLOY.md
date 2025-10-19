# ⚡ Быстрое развертывание на Render

## Вариант 1: Автоматическое развертывание (РЕКОМЕНДУЕТСЯ) 🚀

1. Откройте [https://render.com](https://render.com) и войдите
2. Нажмите **New** → **Blueprint**
3. Подключите GitHub репозиторий: `dispetchercom213-sudo/garant`
4. Render автоматически найдет `render.yaml` и создаст:
   - ✅ PostgreSQL база данных
   - ✅ Backend API (Node.js)
   - ✅ Frontend (Static Site)

5. **Дождитесь завершения** (5-10 минут)

6. **Настройте переменные** (если не установились автоматически):
   - Backend → Environment → добавьте:
     - `DATABASE_URL` - скопируйте из БД (Internal URL)
     - `JWT_SECRET` - любая случайная строка (32+ символа)
     - `CORS_ORIGIN` - URL вашего frontend (например: `https://garant-beton-frontend.onrender.com`)

7. **Заполните базу данных**:
   - Откройте Shell в backend сервисе
   - Выполните: `npm run prisma:seed`

8. **Готово!** 🎉
   - Backend: `https://garant-beton-backend.onrender.com/api/v1/health`
   - Frontend: `https://garant-beton-frontend.onrender.com`

---

## Вариант 2: Ручное создание

### Шаг 1: База данных
- **New** → **PostgreSQL**
- Name: `garant-beton-db`
- Database: `garant_beton`
- Plan: **Free**
- После создания скопируйте **Internal Database URL**

### Шаг 2: Backend
- **New** → **Web Service**
- Подключите репозиторий: `dispetchercom213-sudo/garant`
- Name: `garant-beton-backend`
- Build Command: `npm run build`
- Start Command: `npm start`
- Plan: **Free**
- Environment Variables:
  ```
  DATABASE_URL=<вставьте Internal Database URL>
  JWT_SECRET=<случайная строка минимум 32 символа>
  NODE_ENV=production
  PORT=4000
  CORS_ORIGIN=https://ваш-frontend.onrender.com
  ```

### Шаг 3: Frontend
- **New** → **Static Site**
- Подключите репозиторий: `dispetchercom213-sudo/garant`
- Name: `garant-beton-frontend`
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Plan: **Free**
- Environment Variables:
  ```
  VITE_API_URL=https://ваш-backend.onrender.com
  ```

### Шаг 4: Seed данных
- Откройте **Shell** в backend сервисе
- Выполните: `npm run prisma:seed`

---

## 🔐 Вход в систему

После развертывания:
- **URL**: `https://ваш-frontend.onrender.com`
- **Логин**: `dev`
- **Пароль**: `dev123`

---

## ⚠️ Важно!

### Бесплатный план Render:
- ✅ Бесплатно навсегда
- ⏱️ "Засыпает" после 15 минут бездействия
- 🐌 Первый запрос после "пробуждения": 30-60 секунд
- 💾 База данных: до 90 дней без активности
- 🔄 Автоматический деплой при push в GitHub

### Чтобы сервис не "засыпал":
Используйте UptimeRobot или подобный сервис для ping каждые 10 минут:
```
https://ваш-backend.onrender.com/api/v1/health
```

---

## 🆘 Если что-то не работает

1. **Backend не запускается?**
   - Проверьте логи в Dashboard → Logs
   - Убедитесь что `DATABASE_URL` правильный (Internal URL!)
   - Проверьте что все переменные окружения установлены

2. **Frontend не подключается к Backend?**
   - Проверьте `VITE_API_URL` в настройках frontend
   - Убедитесь что backend успешно развернут
   - Проверьте `CORS_ORIGIN` в backend

3. **База данных не работает?**
   - Дождитесь завершения создания БД (статус: Available)
   - Используйте **Internal** URL, не External
   - Проверьте что миграции выполнены

4. **Ошибка 401 (Unauthorized)?**
   - Выполните seed базы: `npm run prisma:seed`
   - Проверьте что пользователь `dev` создан

---

## 📚 Дополнительная информация

- Полное руководство: [DEPLOYMENT.md](DEPLOYMENT.md)
- Документация Render: [https://render.com/docs](https://render.com/docs)
- Настройка проекта локально: см. [README.md](README.md)

---

**Успешного развертывания! 🚀**

