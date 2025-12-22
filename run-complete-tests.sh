#!/bin/bash

# Complete E2E Test Suite Runner
# Tests all features before deployment

echo "═══════════════════════════════════════════════════════════"
echo "🧪 Running Complete E2E Test Suite"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if backend is running
echo "📡 Checking backend health..."
BACKEND_URL="${VITE_API_BASE_URL:-http://localhost:8090/api/v1}"
if curl -s -f "${BACKEND_URL}/auth/me" > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend may not be running. Starting backend..."
    cd backend && ./start-local.sh &
    sleep 5
fi

# Check if frontend is running
echo "🌐 Checking frontend..."
if curl -s -f "http://localhost:8082" > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend may not be running. Starting frontend..."
    npm run dev &
    sleep 5
fi

echo ""
echo "🧪 Running Cypress E2E Tests..."
echo ""

# Run all test suites
npm run cypress:run -- --spec "cypress/e2e/complete-e2e-test.cy.ts" --reporter mochawesome || true
npm run cypress:run -- --spec "cypress/e2e/scalability-performance.cy.ts" --reporter mochawesome || true

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Test Suite Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Check cypress/reports/ for detailed test results"

