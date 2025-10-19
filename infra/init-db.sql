-- Инициализация базы данных BetonAPP
-- Создание расширений и настроек

-- Включаем расширения для работы с UUID и геометрией
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Настройки локали для корректной работы с русским текстом
SET lc_collate = 'ru_RU.UTF-8';
SET lc_ctype = 'ru_RU.UTF-8';

-- Создаем схему для приложения
CREATE SCHEMA IF NOT EXISTS public;

-- Устанавливаем права доступа
GRANT ALL PRIVILEGES ON DATABASE betonapp TO beton_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO beton_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO beton_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO beton_user;

-- Настройки для оптимизации
ALTER DATABASE betonapp SET timezone TO 'Asia/Almaty';
ALTER DATABASE betonapp SET default_text_search_config TO 'russian';

-- Комментарий к базе данных
COMMENT ON DATABASE betonapp IS 'BetonAPP - Система учёта бетонного завода';



