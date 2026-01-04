#!/bin/bash

# Service Verification Script
# Checks all services are working correctly

set -e

DOMAIN="svnaprojob.online"
API_BASE="https://${DOMAIN}/api/v1"

echo "🔍 Verifying All Services..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "$expected_status" ] || [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $HTTP_CODE)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Check main services
check_service "Website" "https://${DOMAIN}"
check_service "API Health" "${API_BASE}/health"
check_service "Auth Endpoint" "${API_BASE}/auth/login" "405"  # Method not allowed is OK
check_service "Jobs API" "${API_BASE}/jobs?limit=1"
check_service "AI Interview Health" "${API_BASE}/mock-interview-ai/health"

echo ""
echo "✅ Service verification complete!"
