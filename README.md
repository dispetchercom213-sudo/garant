# GARANT BETON - Система управления бетонным производством

## Описание

Полнофункциональная система управления бетонным производством с веб-интерфейсом, включающая:

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **База данных**: PostgreSQL
- **Контейнеризация**: Docker + Docker Compose

## Структура проекта

```
├── backend/                 # Backend приложение (NestJS)
│   ├── src/                # Исходный код
│   ├── prisma/             # Схема БД и миграции
│   ├── package.json        # Зависимости
│   └── tsconfig.json       # Конфигурация TypeScript
├── frontend/               # Frontend приложение (React)
│   ├── src/                # Исходный код
│   ├── public/             # Статические файлы
│   ├── package.json        # Зависимости
│   └── vite.config.ts      # Конфигурация Vite
├── infra/                  # Инфраструктура
│   ├── docker-compose.yml  # Docker Compose конфигурация
│   └── env.production      # Переменные окружения
├── Dockerfile              # Dockerfile для backend
├── .env                    # Локальные переменные окружения
└── deploy.sh               # Скрипт развертывания
```

## Быстрый старт

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и настройте переменные:

```bash
cp backend/env.example .env
```

### 2. Развертывание с Docker

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/v1/health

## Разработка

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Технологии

- **Backend**: NestJS, Prisma, PostgreSQL, JWT
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Инфраструктура**: Docker, Docker Compose, Nginx


