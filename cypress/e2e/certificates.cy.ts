/// <reference types="cypress" />

describe('Certificate Management', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Student - Certificate Upload', () => {
    it('should allow student to upload a certificate', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/certificates');
      
      cy.contains('My Certificates', { timeout: 10000 }).should('be.visible');
      
      // Click upload button
      cy.contains('button', 'Upload Certificate').click();
      
      // Fill form
      cy.get('select').first().select('10th');
      cy.get('input[type="text"]').first().type('10th Standard Marksheet');
      cy.get('input[type="text"]').eq(1).type('CBSE');
      cy.get('input[type="date"]').type('2020-05-15');
      cy.get('input[type="text"]').eq(2).type('95%');
      cy.get('textarea').type('10th standard marksheet from CBSE');
      
      // Upload file (mock)
      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.pdf', { force: true });
      
      // Submit
      cy.contains('button', 'Upload Certificate').click();
      
      // Verify success
      cy.contains('Certificate uploaded successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should display uploaded certificates with status', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/certificates');
      
      cy.contains('My Certificates', { timeout: 10000 }).should('be.visible');
      
      // Check for certificate cards
      cy.get('[data-testid="certificate-card"]').should('exist');
    });

    it('should allow filtering by status and type', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/certificates');
      
      // Filter by status
      cy.contains('All Status').click();
      cy.contains('Pending').click();
      
      // Filter by type
      cy.contains('All Types').click();
      cy.contains('10th Standard').click();
    });
  });

  describe('Admin - Certificate Review', () => {
    it('should allow admin to view pending certificates', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/certificates');
      
      cy.contains('Review Certificates', { timeout: 10000 }).should('be.visible');
      cy.contains('Pending Certificates').should('be.visible');
    });

    it('should allow admin to approve a certificate', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/certificates');
      
      // Click review button on first certificate
      cy.get('button').contains('Review').first().click();
      
      // Select approve
      cy.contains('Approve').click();
      cy.get('textarea').type('Certificate verified and approved');
      
      // Submit
      cy.contains('button', 'Approve').click();
      
      // Verify success
      cy.contains('Certificate approved successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should allow admin to reject a certificate', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/certificates');
      
      // Click review button
      cy.get('button').contains('Review').first().click();
      
      // Select reject
      cy.contains('Reject').click();
      cy.get('textarea').type('Certificate image is unclear');
      
      // Submit
      cy.contains('button', 'Reject').click();
      
      // Verify success
      cy.contains('Certificate rejected successfully', { timeout: 10000 }).should('be.visible');
    });
  });
});

