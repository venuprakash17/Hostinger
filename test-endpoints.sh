#!/bin/bash

# Comprehensive Endpoint Testing Script
# Tests all API endpoints for both local and server environments

echo "═══════════════════════════════════════════════════════════"
echo "🧪 COMPREHENSIVE ENDPOINT TESTING"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 is not installed${NC}"
    exit 1
fi

# Check if requests library is installed
if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing requests library...${NC}"
    pip3 install requests --quiet
fi

# Get base URL
if [ -z "$API_BASE_URL" ]; then
    echo -e "${BLUE}Select environment:${NC}"
    echo "1) Local (http://localhost:8090/api/v1)"
    echo "2) Server (enter custom URL)"
    read -p "Choice [1]: " choice
    choice=${choice:-1}
    
    if [ "$choice" == "2" ]; then
        read -p "Enter server URL (e.g., https://your-server.com/api/v1): " server_url
        API_BASE_URL="$server_url"
    else
        API_BASE_URL="http://localhost:8090/api/v1"
    fi
fi

# Get credentials
if [ -z "$TEST_EMAIL" ]; then
    read -p "Enter test email [superadmin@test.com]: " email
    TEST_EMAIL=${email:-superadmin@test.com}
fi

if [ -z "$TEST_PASSWORD" ]; then
    read -sp "Enter test password: " password
    echo ""
    TEST_PASSWORD="$password"
fi

echo ""
echo -e "${BLUE}Testing endpoints at: ${API_BASE_URL}${NC}"
echo ""

# Run tests
export API_BASE_URL
export TEST_EMAIL
export TEST_PASSWORD

python3 test-all-endpoints.py

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the report above.${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

exit $exit_code

