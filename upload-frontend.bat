@echo off
echo Uploading frontend dist to server...
cd /d C:\Users\ADMIN\Desktop\projekt\GGG
scp -r frontend\dist ubuntu@78.40.109.177:~/garant-beton/frontend/
echo Done!
pause

