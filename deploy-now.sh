#!/bin/bash
# Single command deployment - just run: ./deploy-now.sh
set -e
SERVER="root@72.60.101.14"
SERVER_PATH="/root/elevate-edu"
API_URL="http://72.60.101.14:8000/api/v1"
echo "🚀 Deploying..."
VITE_API_BASE_URL=$API_URL npm run build && \
scp -r dist/* $SERVER:$SERVER_PATH/dist/ && \
scp -r backend/* $SERVER:$SERVER_PATH/backend/ && \
ssh $SERVER "cd $SERVER_PATH && docker-compose up -d --build" && \
echo "✅ Done! Visit: http://72.60.101.14"
