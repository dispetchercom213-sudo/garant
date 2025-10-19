@echo off
chcp 65001 >nul
echo ========================================
echo   ScaleBridge - Тест API
echo ========================================
echo.

echo 1. Проверка подключения (Health Check)
echo ----------------------------------------
curl http://localhost:5055/api/health
echo.
echo.

echo 2. Текущий вес
echo ----------------------------------------
curl http://localhost:5055/api/weight
echo.
echo.

echo 3. Ждем 3 секунды...
timeout /t 3 /nobreak >nul
echo.

echo 4. Текущий вес (повторно - должен измениться)
echo ----------------------------------------
curl http://localhost:5055/api/weight
echo.
echo.

echo 5. Конфигурация
echo ----------------------------------------
curl http://localhost:5055/api/config
echo.
echo.

echo ========================================
echo   Тест завершен!
echo ========================================
pause










