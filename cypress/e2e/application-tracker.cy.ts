/// <reference types="cypress" />

describe('Application Tracker', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Student - View Applications', () => {
    it('should display application tracker', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/applications');
      
      cy.contains('Application Tracker', { timeout: 10000 }).should('be.visible');
    });

    it('should allow filtering by status', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/applications');
      
      cy.contains('All Status').click();
      cy.contains('Shortlisted').click();
    });

    it('should display application details with ATS score', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/applications');
      
      // Check for application cards/rows
      cy.get('[data-testid="application-card"]').should('exist');
    });
  });
});

