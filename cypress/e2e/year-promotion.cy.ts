/// <reference types="cypress" />

describe('Year Promotion', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Student - Request Promotion', () => {
    it('should allow student to request year promotion', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/year-promotion');
      
      cy.contains('Year Promotion', { timeout: 10000 }).should('be.visible');
      
      // Click request button
      cy.contains('button', 'Request Promotion').click();
      
      // Fill form
      cy.get('select').first().select('1st');
      cy.get('select').eq(1).select('2nd');
      cy.get('input[type="number"]').type('5000');
      cy.get('input[type="text"]').type('TXN123456789');
      cy.get('textarea').type('Fee paid via online transfer');
      
      // Submit
      cy.contains('button', 'Submit Request').click();
      
      // Verify success
      cy.contains('Promotion request submitted successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should display promotion request history', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/year-promotion');
      
      cy.contains('Year Promotion', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Admin - Review Promotions', () => {
    it('should allow admin to view pending promotions', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/promotions');
      
      cy.contains('Review Year Promotions', { timeout: 10000 }).should('be.visible');
      cy.contains('Pending Promotion Requests').should('be.visible');
    });

    it('should allow admin to approve a promotion', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/promotions');
      
      // Click review button
      cy.get('button').contains('Review').first().click();
      
      // Select approve
      cy.contains('Approve').click();
      cy.get('textarea').type('Fee verified, promotion approved');
      
      // Submit
      cy.contains('button', 'Approve').click();
      
      // Verify success
      cy.contains('Promotion request approved successfully', { timeout: 10000 }).should('be.visible');
    });
  });
});

