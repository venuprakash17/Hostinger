#!/bin/bash
# Complete E2E Test Suite Runner
echo "🧪 Running Complete E2E Test Suite..."
npm run cypress:run -- --spec "cypress/e2e/complete-e2e-test.cy.ts" --reporter mochawesome
npm run cypress:run -- --spec "cypress/e2e/scalability-performance.cy.ts" --reporter mochawesome
echo "✅ Tests complete! Check cypress/reports/ for results"
