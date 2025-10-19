@echo off
echo 🚀 Starting GARANT BETON build process...

REM Backend build
echo 📦 Installing backend dependencies...
cd backend
call npm install

echo 🔧 Generating Prisma client...
call npx prisma generate

echo 🏗️ Building backend...
call npm run build

echo ✅ Backend build completed!

cd ..
echo 🎉 Build process finished successfully!

