@echo off
echo ========================================
echo   ScaleBridge - Перезапуск
echo ========================================
echo.

echo Остановка процессов...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ScaleBridge*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Запуск ScaleBridge...
start "" npm start

echo.
echo ========================================
echo   ScaleBridge перезапущен!
echo   Проверьте: http://localhost:5055/api/health
echo ========================================
pause










