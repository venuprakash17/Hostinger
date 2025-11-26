/// <reference types="cypress" />

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Analytics Display', () => {
    it('should display analytics dashboard with real-time stats', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/analytics');
      
      cy.contains('Analytics Dashboard', { timeout: 10000 }).should('be.visible');
      
      // Check for stat cards
      cy.contains('Active Students').should('be.visible');
      cy.contains('Coding Problems').should('be.visible');
      cy.contains('Mock Interviews').should('be.visible');
      cy.contains('Applications').should('be.visible');
    });

    it('should display segmentation charts', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/analytics');
      
      cy.contains('Analytics Dashboard', { timeout: 10000 }).should('be.visible');
      
      // Check for segmentation charts
      cy.contains('Students by Department').should('be.visible');
      cy.contains('Students by Section').should('be.visible');
      cy.contains('Students by Year').should('be.visible');
    });

    it('should display application analytics', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/analytics');
      
      // Click Applications tab
      cy.contains('Job Applications').click();
      
      // Check for application stats
      cy.contains('Total Applications', { timeout: 10000 }).should('be.visible');
      cy.contains('Shortlisted').should('be.visible');
      cy.contains('Offers Received').should('be.visible');
    });

    it('should display recent applications table', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/analytics');
      cy.contains('Job Applications').click();
      
      cy.contains('Recent Applications', { timeout: 10000 }).should('be.visible');
      cy.contains('Company').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });
});

