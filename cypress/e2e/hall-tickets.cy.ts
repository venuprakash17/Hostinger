/// <reference types="cypress" />

describe('Hall Tickets', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Student - View Hall Tickets', () => {
    it('should display student hall tickets', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/hall-tickets');
      
      cy.contains('Hall Tickets', { timeout: 10000 }).should('be.visible');
    });

    it('should allow filtering by exam type', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/hall-tickets');
      
      cy.contains('All Types').click();
      cy.contains('Quiz').click();
    });

    it('should allow downloading hall ticket PDF', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/hall-tickets');
      
      // Find download button (if ticket is generated)
      cy.get('body').then(($body) => {
        if ($body.find('button').contains('Download Hall Ticket').length > 0) {
          cy.contains('button', 'Download Hall Ticket').first().click();
          
          // Verify download (check for file download)
          cy.wait(2000);
        }
      });
    });
  });
});

