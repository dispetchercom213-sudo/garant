@echo off
echo Uploading project to server...

scp -r backend ubuntu@78.40.109.177:/root/garant-beton/
scp -r frontend ubuntu@78.40.109.177:/root/garant-beton/
scp docker-compose.yml ubuntu@78.40.109.177:/root/garant-beton/
scp Dockerfile ubuntu@78.40.109.177:/root/garant-beton/
scp nginx.conf ubuntu@78.40.109.177:/root/garant-beton/
scp .dockerignore ubuntu@78.40.109.177:/root/garant-beton/

echo.
echo Upload complete!
echo.
echo Now SSH to the server and run:
echo   cd /root/garant-beton
echo   docker-compose build
echo   docker-compose up -d

