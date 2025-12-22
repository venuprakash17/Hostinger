#!/bin/bash
# Check specific jobs endpoint error

echo "🔍 Checking jobs endpoint specific error..."
echo ""

ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs --tail=300 backend | grep -B 10 -A 30 "GET.*jobs\|list_jobs\|jobs.*500" | tail -80'

