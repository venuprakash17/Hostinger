#!/bin/bash

# Production Build Script
# This script builds the frontend for production deployment

echo "🚀 Building Frontend for Production..."
echo ""

# Set production environment variables
export VITE_API_BASE_URL="http://72.60.101.14:8000/api/v1"
export VITE_WS_BASE_URL="ws://72.60.101.14:8000"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for production
echo "🔨 Building production bundle..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📁 Production files are in the 'dist' folder"
    echo ""
    echo "📤 Next steps:"
    echo "   1. Upload 'dist' folder contents to: /var/www/elevate-edu-ui/dist/"
    echo "   2. Upload 'backend' folder to: /home/your-user/elevate-edu-backend/"
    echo ""
    echo "📋 See DEPLOYMENT_README.md for detailed instructions"
else
    echo ""
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

