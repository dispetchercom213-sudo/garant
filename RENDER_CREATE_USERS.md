# Создание пользователей на Render

## 🎯 Цель
Создать пользователей **admin** и **dev** в базе данных на Render.

---

## ✅ Способ 1: Автоматически через Pre-Deploy Hook (Рекомендуется для Free Plan)

**Этот способ уже настроен в `render.yaml`!**

### Что происходит автоматически:
1. При каждом деплое Render выполняет `preDeployCommand`
2. Запускаются миграции БД: `npx prisma migrate deploy`
3. Создаются пользователи: `node create-users.js`

### Что нужно сделать:
**НИЧЕГО!** Просто задеплойте проект на Render:

1. Перейдите на https://dashboard.render.com
2. Нажмите **"New +"** → **"Blueprint"**
3. Выберите репозиторий **`dispetchercom213-sudo/garant`**
4. Render автоматически:
   - Создаст сервисы (Backend, Frontend, Database)
   - Выполнит миграции
   - **Создаст пользователей admin и dev**

### Проверка в логах:
После деплоя откройте **Logs** для `garant-beton-backend` и найдите:
```
==> Running preDeployCommand: cd backend && npx prisma migrate deploy && node create-users.js
🚀 Создание пользователей...
✅ Создан пользователь: admin (ADMIN)
✅ Создан пользователь: dev (DEVELOPER)
```

**Примечание:** Если пользователи уже существуют, вы увидите:
```
⚠️  Пользователь admin уже существует
⚠️  Пользователь dev уже существует
```

---

## 📋 Способ 2: Через SSH (Альтернатива)

Если у вас есть SSH доступ к Render:

```bash
# 1. Подключитесь к сервису
render ssh garant-beton-backend

# 2. Перейдите в директорию backend
cd backend

# 3. Запустите скрипт
node create-users.js
```

---

## 📋 Способ 3: Через Pre-Deploy Hook (Автоматически)

Добавьте в `render.yaml` pre-deploy команду:

```yaml
services:
  - type: web
    name: garant-beton-backend
    # ...
    preDeployCommand: node create-users.js  # Добавить эту строку
```

**Минус:** Создаст пользователей при каждом деплое (но скрипт проверяет существование).

---

## 🔐 Учетные данные

После создания вы можете войти:

| Логин | Пароль | Роль |
|-------|--------|------|
| `admin` | `admin123` | ADMIN |
| `dev` | `dev123` | DEVELOPER |

### ⚠️ ВАЖНО: Безопасность

**После первого входа обязательно смените пароли!**

Для смены пароля:
1. Войдите в систему
2. Перейдите в **Профиль**
3. Измените пароль на надежный

---

## 🧪 Проверка

### 1. Проверьте через API
```bash
curl -X POST https://garant-beton-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Должен вернуть JWT токен.

### 2. Проверьте через Frontend
1. Откройте https://garant-beton-frontend.onrender.com
2. Войдите с логином `admin` / `admin123`

---

## ❓ Troubleshooting

### Ошибка: "PrismaClient is not able to connect to the database"
- Проверьте, что `DATABASE_URL` правильно настроен
- Убедитесь, что миграции выполнены: `npx prisma migrate deploy`

### Ошибка: "User already exists"
- Пользователи уже созданы ✅
- Можете войти с существующими учетными данными

### Нужно пересоздать пользователя
```bash
# Войдите в Render Shell и выполните:
npx prisma studio  # Откроет интерфейс для управления БД
# Или через SQL:
npx prisma db execute --stdin <<< "DELETE FROM \"User\" WHERE login='admin';"
node create-users.js
```

---

## 🎉 Готово!

После выполнения этих шагов у вас будут созданы пользователи **admin** и **dev** на Render.

