#!/bin/bash

# BuySial Deployment Script
# This script builds the frontend and pushes changes to the repository

echo "🚀 Starting BuySial deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run from the root directory."
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully!"

# Go back to root directory
cd ..

# Add changes and commit
echo "📝 Committing changes..."
git add -f frontend/dist/
git add frontend/.gitignore
git add frontend/package-lock.json

git commit -m "Deploy frontend build - $(date '+%Y-%m-%d %H:%M:%S')"

# Push to repository
echo "📤 Pushing to repository..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Your changes are now live at https://github.com/thehassans/fixedsial.git"
else
    echo "❌ Push failed! Please check your git configuration."
    exit 1
fi
