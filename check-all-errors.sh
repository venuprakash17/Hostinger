#!/bin/bash
# Script to check all backend errors and identify missing columns

echo "🔍 Checking backend logs for all errors..."
echo ""

ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs --tail=200 backend | grep -A 15 "UndefinedColumn\|does not exist\|ProgrammingError" | head -100'

echo ""
echo "✅ Error check complete!"

