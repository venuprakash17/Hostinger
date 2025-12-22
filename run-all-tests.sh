#!/bin/bash

# Comprehensive Test Runner for All Features
# This script runs all Cypress tests and fixes issues

set -e

echo "🧪 Running Comprehensive E2E Tests for All Features"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if backend is running
echo -e "${YELLOW}📡 Step 1: Checking backend health...${NC}"
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")

if [ "$BACKEND_HEALTH" != "200" ]; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo -e "${YELLOW}   Please start backend: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is healthy${NC}"

# Step 2: Check if frontend is running
echo -e "${YELLOW}🌐 Step 2: Checking frontend...${NC}"
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000")

if [ "$FRONTEND_HEALTH" != "200" ]; then
    echo -e "${RED}❌ Frontend is not running!${NC}"
    echo -e "${YELLOW}   Please start frontend: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend is running${NC}"

# Step 3: Install dependencies if needed
echo -e "${YELLOW}📦 Step 3: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   Installing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}✅ Dependencies ready${NC}"

# Step 4: Run comprehensive test suite
echo -e "${YELLOW}🚀 Step 4: Running comprehensive test suite...${NC}"
echo ""

# Run the comprehensive test file
npx cypress run --spec "cypress/e2e/all-features-comprehensive.cy.ts" --headless || {
    echo -e "${RED}❌ Comprehensive tests failed${NC}"
    echo -e "${YELLOW}   Running individual test suites to identify issues...${NC}"
    
    # Run individual test suites
    echo ""
    echo -e "${YELLOW}Running login tests...${NC}"
    npx cypress run --spec "cypress/e2e/all-roles-login.cy.ts" --headless || true
    
    echo ""
    echo -e "${YELLOW}Running coding practice tests...${NC}"
    npx cypress run --spec "cypress/e2e/coding-practice-complete.cy.ts" --headless || true
    
    echo ""
    echo -e "${YELLOW}Running bulk upload tests...${NC}"
    npx cypress run --spec "cypress/e2e/bulk-uploads.cy.ts" --headless || true
    
    exit 1
}

echo ""
echo -e "${GREEN}✅ All comprehensive tests passed!${NC}"

# Step 5: Generate test report
echo -e "${YELLOW}📊 Step 5: Generating test report...${NC}"
npm run test:merge-reports || true

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ All Tests Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "${BLUE}📋 Test Report:${NC}"
echo "   - HTML Report: cypress/reports/html/merged-report.html"
echo "   - JSON Report: cypress/reports/merged-report.json"
echo ""

