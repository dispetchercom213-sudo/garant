# Создание пользователей на Render

## 🎯 Цель
Создать пользователей **admin** и **dev** в базе данных на Render.

---

## 📋 Способ 1: Через Render Shell (Рекомендуется)

### Шаг 1: Откройте Shell на Render
1. Перейдите на https://dashboard.render.com
2. Выберите сервис **garant-beton-backend**
3. Нажмите на вкладку **"Shell"** в верхнем меню
4. Дождитесь загрузки shell

### Шаг 2: Запустите скрипт создания пользователей
Выполните команду:
```bash
node create-users.js
```

### Шаг 3: Проверьте результат
Вы должны увидеть:
```
🚀 Создание пользователей...

✅ Создан пользователь: admin (ADMIN)
✅ Создан пользователь: dev (DEVELOPER)

✅ Готово! Пользователи созданы:
   📧 admin / admin123 (ADMIN)
   📧 dev / dev123 (DEVELOPER)

⚠️  ВАЖНО: Смените пароли после первого входа!
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

