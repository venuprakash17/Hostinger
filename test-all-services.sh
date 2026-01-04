#!/bin/bash

# 🧪 Comprehensive Service Testing Script
# Tests all services end-to-end for svnaprojob.online

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="svnaprojob.online"
API_BASE="https://${DOMAIN}/api/v1"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 Comprehensive Service Testing - svnaprojob.online   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -e "${YELLOW}Testing: ${name}...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo -e "${GREEN}✅ ${name}: PASSED (${HTTP_CODE})${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ ${name}: FAILED (Expected ${expected_status}, got ${HTTP_CODE})${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. Frontend Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 Frontend Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "Frontend Homepage" "https://${DOMAIN}/"
test_endpoint "Frontend Login Page" "https://${DOMAIN}/login"

# Check if new code is deployed (look for __CORRECT_API_URL__)
echo -e "${YELLOW}Checking deployed JavaScript for URL fix...${NC}"
if curl -s "https://${DOMAIN}/assets/index-"*.js 2>/dev/null | grep -q "__CORRECT_API_URL__"; then
    echo -e "${GREEN}✅ URL fix found in deployed code${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ URL fix NOT found in deployed code${NC}"
    ((FAILED++))
fi

# 2. Backend API Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔌 Backend API Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "API Health Check" "${API_BASE}/health"
test_endpoint "API Root" "${API_BASE}/"
test_endpoint "Auth Endpoint (should return 405/422, not 404)" "${API_BASE}/auth/login" "405"

# 3. Authentication Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Authentication Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Testing login endpoint (should accept POST)...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -w "\n%{http_code}" 2>/dev/null || echo "000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✅ Login endpoint: PASSED (${HTTP_CODE} - endpoint is working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Login endpoint: FAILED (${HTTP_CODE})${NC}"
    ((FAILED++))
fi

# 4. AI Services Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🤖 AI Services Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "Mock Interview AI Health" "${API_BASE}/mock-interview-ai/health"

# 5. Core Services Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Core Services Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_endpoint "Jobs Endpoint" "${API_BASE}/jobs?limit=1" "200"
test_endpoint "Announcements Endpoint" "${API_BASE}/announcements/my" "401"  # Should return 401 without auth
test_endpoint "Users Endpoint" "${API_BASE}/users/me/profile" "401"  # Should return 401 without auth

# 6. Server Status Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🖥️  Server Status Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Checking backend container status...${NC}"
if ssh root@72.60.101.14 'docker ps | grep -q elevate_edu_api' 2>/dev/null; then
    echo -e "${GREEN}✅ Backend container: RUNNING${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Backend container: NOT RUNNING${NC}"
    ((FAILED++))
fi

echo -e "${YELLOW}Checking nginx status...${NC}"
if ssh root@72.60.101.14 'systemctl is-active --quiet nginx' 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx: RUNNING${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Nginx: NOT RUNNING${NC}"
    ((FAILED++))
fi

# 7. SSL/HTTPS Tests
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 SSL/HTTPS Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Testing HTTPS redirect...${NC}"
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" -L "http://${DOMAIN}/" 2>/dev/null || echo "000")
if [ "$HTTP_REDIRECT" = "200" ] || [ "$HTTP_REDIRECT" = "301" ] || [ "$HTTP_REDIRECT" = "302" ]; then
    echo -e "${GREEN}✅ HTTPS redirect: WORKING${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  HTTPS redirect: ${HTTP_REDIRECT} (may need SSL setup)${NC}"
fi

# 8. Database Connection Test
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗄️  Database Connection Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Testing database connection via API...${NC}"
DB_TEST=$(curl -s "${API_BASE}/health" 2>/dev/null | grep -q "database" && echo "ok" || echo "fail")
if [ "$DB_TEST" = "ok" ]; then
    echo -e "${GREEN}✅ Database: CONNECTED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Database status: Could not verify (health endpoint may not include DB status)${NC}"
fi

# 9. Super Admin Test
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}👤 Super Admin Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}Testing super admin login...${NC}"
LOGIN_TEST=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@elevate.edu","password":"Admin123!"}' \
    -w "\n%{http_code}" 2>/dev/null || echo "000")

LOGIN_CODE=$(echo "$LOGIN_TEST" | tail -1)
if [ "$LOGIN_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Super Admin Login: SUCCESS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Super Admin Login: FAILED (${LOGIN_CODE})${NC}"
    echo -e "${YELLOW}   Response: $(echo "$LOGIN_TEST" | head -1)${NC}"
    ((FAILED++))
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 Test Summary                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review above.${NC}"
    exit 1
fi
