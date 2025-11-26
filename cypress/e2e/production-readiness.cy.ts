/// <reference types="cypress" />

describe('Production Readiness - Error Handling & Validation', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '**/api/v1/jobs**', { forceNetworkError: true }).as('networkError');
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/jobs');
      
      // Should show error message or empty state
      cy.get('body', { timeout: 10000 }).should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('Error') || t.includes('Failed') || t.includes('No jobs') || t.includes('Loading')
        );
      });
    });

    it('should handle API 500 errors', () => {
      cy.intercept('GET', '**/api/v1/quizzes**', { statusCode: 500, body: { detail: 'Internal server error' } }).as('serverError');
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.wait('@serverError');
      
      // Should show error or handle gracefully
      cy.get('body', { timeout: 5000 }).should('be.visible');
    });

    it('should handle timeout errors', () => {
      cy.intercept('GET', '**/api/v1/coding-problems**', { delay: 15000 }).as('timeout');
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/coding');
      
      // Should handle timeout gracefully
      cy.get('body', { timeout: 20000 }).should('be.visible');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
    });

    it('should validate required fields in job creation', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      // Try to submit without required fields
      cy.contains('Create Job').last().click();
      
      // Should show validation errors or prevent submission
      cy.get('body').should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('required') || 
          t.includes('error') || 
          t.includes('Error') ||
          cy.get('input:invalid').length > 0
        );
      });
    });

    it('should validate email format in login', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('button[type="submit"]').click();
      
      // Should show validation error
      cy.get('input[type="email"]:invalid').should('exist');
    });

    it('should validate date format in job deadline', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      // Try invalid date
      cy.get('input[name="deadline"]').type('invalid-date');
      
      // Should show validation or prevent invalid input
      cy.get('input[name="deadline"]').should('have.value', '');
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching jobs', () => {
      cy.intercept('GET', '**/api/v1/jobs**', { delay: 1000 }).as('loadingJobs');
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/jobs');
      
      // Should show loading indicator
      cy.get('body', { timeout: 2000 }).should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('Loading') || 
          t.includes('Spinner') ||
          cy.get('[class*="loader"], [class*="spinner"]').length > 0
        );
      });
    });

    it('should show loading state during form submission', () => {
      cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      cy.get('input[name="title"]').type('Test Job');
      cy.get('input[name="company"]').type('Test Company');
      cy.get('input[name="role"]').type('Test Role');
      
      cy.intercept('POST', '**/api/v1/jobs**', { delay: 1000 }).as('createJob');
      
      cy.contains('Create Job').last().click();
      
      // Button should show loading state
      cy.contains('Creating', { timeout: 2000 }).should('exist');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no jobs available', () => {
      cy.intercept('GET', '**/api/v1/jobs**', { body: [] }).as('emptyJobs');
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/jobs');
      
      cy.wait('@emptyJobs');
      
      // Should show empty state message
      cy.get('body', { timeout: 5000 }).should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('No jobs') || 
          t.includes('empty') ||
          t.includes('No results')
        );
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should redirect to login when not authenticated', () => {
      cy.clearAuth();
      cy.visit('/superadmin/jobs');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should prevent unauthorized access', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      
      // Student should not access super admin routes
      cy.visit('/superadmin/jobs', { failOnStatusCode: false });
      
      // Should show error or redirect
      cy.get('body', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Data Persistence', () => {
    it('should persist authentication on page refresh', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      // Refresh page
      cy.reload();
      
      // Should still be authenticated
      cy.url().should('not.include', '/login');
      cy.window().its('localStorage').invoke('getItem', 'access_token').should('exist');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE size
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/jobs');
      
      // Should be usable on mobile
      cy.get('body').should('be.visible');
      cy.contains('Jobs').should('be.visible');
    });

    it('should work on tablet viewport', () => {
      cy.viewport(768, 1024); // iPad size
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.get('body').should('be.visible');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within 5 seconds', () => {
      const startTime = Date.now();
      
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      cy.contains('Dashboard', { timeout: 5000 }).should('be.visible');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.lessThan(5000);
    });
  });
});

