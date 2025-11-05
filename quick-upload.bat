@echo off
echo Uploading files...
scp -r backend\dist ubuntu@78.40.109.177:~/garant-beton/backend/
scp -r frontend\dist ubuntu@78.40.109.177:~/garant-beton/frontend/
echo Done!


