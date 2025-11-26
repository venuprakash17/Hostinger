// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Hide fetch/XHR requests from command log
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // on uncaught exceptions (useful for development)
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  // Ignore connection errors when backend is down (tests will handle this)
  if (err.message.includes('ERR_CONNECTION_REFUSED') || 
      err.message.includes('Failed to fetch')) {
    return false;
  }
  return true;
});

// Global before hook - check backend health (non-blocking)
before(() => {
  cy.log('🔍 Checking backend health...');
  cy.request({
    method: 'GET',
    url: Cypress.env('BACKEND_URL') || 'http://localhost:8000/health',
    failOnStatusCode: false,
    timeout: 5000,
  }).then((response) => {
    if (response.status === 200) {
      cy.log('✅ Backend is healthy');
    } else {
      cy.log('⚠️ Backend may not be running - some tests may fail');
      cy.log('💡 Start backend: cd backend && ./start_server.sh');
    }
  });
});

