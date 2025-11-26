/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as a specific role
       * @example cy.loginAs('superadmin@elevate.edu', 'SA001', 'super_admin')
       */
      loginAs(email: string, password: string, expectedRole?: string): Chainable<void>;
      
      /**
       * Custom command to wait for backend to be ready
       */
      waitForBackend(timeout?: number): Chainable<void>;
      
      /**
       * Custom command to clear all auth state
       */
      clearAuth(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (email: string, password: string, expectedRole?: string) => {
  cy.visit('/login');
  
  // Determine which tab to use
  if (email.includes('student') || expectedRole === 'student') {
    // Student tab is default, no need to click
    cy.get('#student-email').should('be.visible');
    cy.get('#student-email').type(email);
    cy.get('#student-password').type(password);
  } else {
    // Click on Faculty/Admin tab
    cy.contains('Faculty / Admin').click();
    cy.get('#staff-email').should('be.visible');
    cy.get('#staff-email').type(email);
    cy.get('#staff-password').type(password);
  }
  
  cy.get('button[type="submit"]').click();
  
  // Wait for navigation - increased timeout for login processing
  cy.url({ timeout: 15000 }).should('not.include', '/login');
  
  // Verify token exists
  cy.window().its('localStorage').invoke('getItem', 'access_token').should('exist');
  
  // Verify correct dashboard based on role
  if (expectedRole) {
    const roleMap: Record<string, string> = {
      'super_admin': '/superadmin/dashboard',
      'admin': '/admin/dashboard',
      'hod': '/faculty/dashboard',
      'faculty': '/faculty/dashboard',
      'student': '/dashboard',
    };
    
    if (roleMap[expectedRole]) {
      cy.url().should('include', roleMap[expectedRole]);
    }
  }
});

Cypress.Commands.add('waitForBackend', (timeout = 5000) => {
  const apiUrl = Cypress.env('apiBaseUrl') || 'http://localhost:8000/api/v1';
  
  cy.request({
    method: 'GET',
    url: `${apiUrl}/health`,
    failOnStatusCode: false,
    timeout: timeout
  }).then((response) => {
    if (response.status === 200) {
      cy.log('✅ Backend is ready');
    } else {
      cy.log('⚠️ Backend health check failed, but continuing...');
    }
  });
});

Cypress.Commands.add('clearAuth', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
});

export {};
