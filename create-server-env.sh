#!/bin/bash
# Script to create .env file on server if it doesn't exist

echo "📝 Creating .env file on server..."
echo ""
echo "Run this command to create .env file on server:"
echo ""
echo "ssh root@72.60.101.14 'cat > /root/elevate-edu/.env << EOF"
echo "POSTGRES_PASSWORD=change_me_in_production"
echo "SECRET_KEY=\$(openssl rand -hex 32)"
echo "BACKEND_CORS_ORIGINS=http://72.60.101.14,http://72.60.101.14:80,http://srv1159261.hstgr.cloud,http://srv1159261.hstgr.cloud:80"
echo "DEBUG=False"
echo "EOF"
echo "'"
echo ""
echo "Then restart services:"
echo "ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose down && docker-compose up -d --build'"

