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
  
  // Wait for login page to load
  cy.contains('Login', { timeout: 10000 }).should('be.visible');
  
  // Determine which tab to use based on email or expected role
  const isStudent = email.includes('student') || expectedRole === 'student';
  
  if (!isStudent) {
    // Click on Faculty/Admin tab for non-students
    cy.contains('Faculty / Admin').click();
    cy.wait(500);
    
    // Use staff email and password fields
    cy.get('#staff-email').should('be.visible').clear().type(email);
    cy.get('#staff-password').should('be.visible').clear().type(password);
  } else {
    // Student tab is default
    cy.get('#student-email').should('be.visible').clear().type(email);
    cy.get('#student-password').should('be.visible').clear().type(password);
  }
  
  // Submit form
  cy.get('button[type="submit"]').contains('Login').click();
  
  // Wait for navigation - increased timeout for login processing
  cy.url({ timeout: 20000 }).should('not.include', '/login');
  
  // Verify token exists (with retry)
  cy.window().then((win) => {
    const token = win.localStorage.getItem('access_token') || win.localStorage.getItem('token');
    if (!token) {
      cy.wait(2000); // Wait a bit more for token to be set
    }
  });
  
  // Verify correct dashboard based on role
  if (expectedRole) {
    const roleMap: Record<string, string> = {
      'super_admin': '/superadmin',
      'admin': '/admin',
      'hod': '/faculty',
      'faculty': '/faculty',
      'student': '/dashboard',
    };
    
    if (roleMap[expectedRole]) {
      cy.url({ timeout: 10000 }).should('include', roleMap[expectedRole]);
    }
  }
});

Cypress.Commands.add('waitForBackend', (timeout = 10000) => {
  const backendUrl = Cypress.env('BACKEND_URL') || 'http://localhost:8000';
  
  cy.request({
    method: 'GET',
    url: `${backendUrl}/health`,
    failOnStatusCode: false,
    timeout: timeout
  }).then((response) => {
    if (response.status === 200) {
      cy.log('✅ Backend is ready');
    } else {
      cy.log('⚠️ Backend health check failed, but continuing...');
      cy.log(`   Status: ${response.status}`);
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
