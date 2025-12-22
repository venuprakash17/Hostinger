#!/bin/bash
# Get the exact jobs endpoint error

echo "🔍 Getting jobs endpoint error details..."
echo ""

ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs --tail=500 backend | grep -B 10 -A 50 "GET.*jobs.*500\|list_jobs\|jobs.*Error" | tail -100'

