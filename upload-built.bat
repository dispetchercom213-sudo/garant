@echo off
echo Uploading built files to server...

REM Upload backend dist
scp -r backend\dist ubuntu@78.40.109.177:~/garant-beton/backend/
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload backend/dist
    pause
    exit /b %errorlevel%
)

REM Upload backend node_modules
scp -r backend\node_modules ubuntu@78.40.109.177:~/garant-beton/backend/
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload backend/node_modules
    pause
    exit /b %errorlevel%
)

REM Upload frontend dist
scp -r frontend\dist ubuntu@78.40.109.177:~/garant-beton/frontend/
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload frontend/dist
    pause
    exit /b %errorlevel%
)

echo All files uploaded successfully!
pause


