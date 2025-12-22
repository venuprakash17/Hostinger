#!/bin/bash
# Check jobs endpoint error

echo "🔍 Checking jobs endpoint error..."
echo ""

ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs --tail=200 backend | grep -B 5 -A 20 "jobs\|Jobs" | grep -A 20 "Error\|Exception\|Traceback\|UndefinedColumn" | head -80'

