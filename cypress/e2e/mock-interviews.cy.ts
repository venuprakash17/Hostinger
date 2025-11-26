/// <reference types="cypress" />

describe('Mock Interviews', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Student - View Interviews', () => {
    it('should display student interviews', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/mock-interviews');
      
      cy.contains('Mock Interviews', { timeout: 10000 }).should('be.visible');
    });

    it('should allow filtering by status', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/mock-interviews');
      
      cy.contains('All Status').click();
      cy.contains('Scheduled').click();
    });

    it('should allow starting an interview', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/mock-interviews');
      
      // Find and click start interview button
      cy.get('button').contains('Start Interview').first().click();
      
      // Verify status change
      cy.contains('Interview started successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Admin - Manage Interviews', () => {
    it('should allow admin to schedule an interview', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/mock-interviews');
      
      cy.contains('Manage Mock Interviews', { timeout: 10000 }).should('be.visible');
      
      // Click schedule button
      cy.contains('button', 'Schedule Interview').click();
      
      // Fill form
      cy.get('input[type="text"]').first().type('Technical Interview - Round 1');
      cy.get('select').first().select('technical');
      
      // Select student (if dropdown available)
      cy.get('body').then(($body) => {
        if ($body.find('select').length > 1) {
          cy.get('select').eq(1).select(1);
        }
      });
      
      // Set date and time
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().slice(0, 16);
      cy.get('input[type="datetime-local"]').type(dateString);
      
      cy.get('input[type="number"]').type('60');
      cy.get('input[type="text"]').eq(1).type('https://zoom.us/j/123456789');
      cy.get('input[type="text"]').eq(2).type('John Doe');
      
      // Submit
      cy.contains('button', 'Schedule Interview').click();
      
      // Verify success
      cy.contains('Interview scheduled successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should display scheduled interviews in table', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/mock-interviews');
      
      cy.contains('Scheduled Interviews', { timeout: 10000 }).should('be.visible');
    });
  });
});

