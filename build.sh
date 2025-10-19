#!/bin/bash

echo "🚀 Starting GARANT BETON build process..."

# Backend build
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🏗️ Building backend..."
npm run build

echo "✅ Backend build completed!"

cd ..
echo "🎉 Build process finished successfully!"

