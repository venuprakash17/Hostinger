/// <reference types="cypress" />

/**
 * HOD Coding Labs End-to-End Tests
 * Tests HOD's ability to create and manage coding labs
 */

describe('HOD Coding Labs Management', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('HOD - Lab Creation', () => {
    beforeEach(() => {
      // Login as HOD
      cy.loginAs('hod.cs@elevate.edu', 'Hod@123', 'hod');
    });

    it('should display Coding Labs page with Create Lab button', () => {
      cy.visit('/coding-labs');
      
      // Should see the Coding Labs page
      cy.contains('Coding Labs').should('be.visible');
      
      // HOD should see Create Lab button
      cy.contains('Create Lab').should('be.visible');
    });

    it('should allow HOD to create a new coding lab', () => {
      cy.visit('/coding-labs');
      
      // Click Create Lab button
      cy.contains('Create Lab').click();
      
      // Should navigate to lab builder
      cy.url().should('include', '/coding-labs/new');
      
      // Fill in lab details
      cy.get('input[name="title"], input[placeholder*="title" i]').first().type('HOD Test Lab - Python Basics');
      
      // Fill description if field exists
      cy.get('textarea[name="description"], textarea[placeholder*="description" i]').first().type('A test lab created by HOD for Python basics');
      
      // Select mode
      cy.get('select[name="mode"], button:contains("Mode")').first().click();
      cy.contains('Practice').click();
      
      // Select difficulty
      cy.get('select[name="difficulty"], button:contains("Difficulty")').first().click();
      cy.contains('Easy').click();
      
      // Set topic
      cy.get('input[name="topic"], input[placeholder*="topic" i]').first().type('python');
      
      // Create the lab
      cy.contains('Create Lab', { timeout: 10000 }).click();
      
      // Should see success message
      cy.contains('Lab created successfully', { timeout: 15000 }).should('be.visible');
      
      // Should redirect to lab builder page
      cy.url().should('include', '/coding-labs/');
      cy.url().should('include', '/build');
    });

    it('should allow HOD to view created labs', () => {
      cy.visit('/coding-labs');
      
      // Should see labs list
      cy.get('[class*="card"], [class*="grid"]').should('exist');
      
      // HOD should see all labs (published and unpublished)
      cy.contains('HOD Test Lab').should('be.visible');
    });

    it('should allow HOD to edit lab', () => {
      cy.visit('/coding-labs');
      
      // Find and click on a lab created by HOD
      cy.contains('HOD Test Lab').parent().parent().within(() => {
        cy.get('button').contains('Edit').click();
      });
      
      // Should navigate to lab builder
      cy.url().should('include', '/build');
      
      // Should see lab settings
      cy.contains('Edit Lab').should('be.visible');
    });

    it('should allow HOD to monitor lab', () => {
      cy.visit('/coding-labs');
      
      // Find lab and click monitor
      cy.contains('HOD Test Lab').parent().parent().within(() => {
        cy.get('button[title="Monitor students"], button:contains("Monitor")').first().click();
      });
      
      // Should navigate to monitor page
      cy.url().should('include', '/monitor');
      
      // Should see monitoring interface
      cy.contains('Monitor', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('HOD - Lab Management', () => {
    beforeEach(() => {
      cy.loginAs('hod.cs@elevate.edu', 'Hod@123', 'hod');
    });

    it('should allow HOD to add problems to lab', () => {
      cy.visit('/coding-labs');
      
      // Find a lab and go to builder
      cy.contains('HOD Test Lab').parent().parent().within(() => {
        cy.get('button').contains('Edit').click();
      });
      
      // Wait for lab builder to load
      cy.url().should('include', '/build');
      cy.wait(2000);
      
      // Navigate to Problems tab
      cy.contains('Problems').click();
      
      // Click Add Problem
      cy.contains('Add Problem').click();
      
      // Fill problem details
      cy.get('input[name="title"], input[placeholder*="title" i]').first().type('Sum Two Numbers');
      cy.get('textarea[name="description"], textarea[placeholder*="description" i]').first().type('Write a function to add two numbers');
      cy.get('textarea[name="problem_statement"], textarea[placeholder*="statement" i]').first().type('Given two numbers a and b, return their sum');
      
      // Add starter code
      cy.get('textarea[name="starter_code"], textarea[placeholder*="starter" i]').first().type('def add(a, b):\n    pass');
      
      // Set points
      cy.get('input[name="points"], input[type="number"]').first().clear().type('100');
      
      // Create problem
      cy.contains('Create Problem', { timeout: 10000 }).click();
      
      // Should see success
      cy.contains('Problem created', { timeout: 10000 }).should('be.visible');
    });

    it('should allow HOD to publish lab', () => {
      cy.visit('/coding-labs');
      
      // Find lab and edit
      cy.contains('HOD Test Lab').parent().parent().within(() => {
        cy.get('button').contains('Edit').click();
      });
      
      cy.url().should('include', '/build');
      cy.wait(2000);
      
      // Go to Lab Settings tab
      cy.contains('Lab Settings', { timeout: 10000 }).click();
      
      // Toggle published switch
      cy.get('input[type="checkbox"][name*="published"], button[role="switch"]').first().click();
      
      // Save lab
      cy.contains('Update Lab', { timeout: 10000 }).click();
      
      // Should see success
      cy.contains('Lab updated', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('HOD - Access Verification', () => {
    it('should verify HOD role is recognized', () => {
      cy.loginAs('hod.cs@elevate.edu', 'Hod@123', 'hod');
      
      cy.visit('/coding-labs');
      
      // HOD should see Create Lab button
      cy.contains('Create Lab').should('be.visible');
      
      // HOD should see all labs (not just published)
      cy.get('[class*="card"]').should('have.length.greaterThan', 0);
    });

    it('should verify HOD can access lab builder', () => {
      cy.loginAs('hod.cs@elevate.edu', 'Hod@123', 'hod');
      
      cy.visit('/coding-labs/new');
      
      // Should see lab builder page
      cy.contains('Create New Lab', { timeout: 10000 }).should('be.visible');
    });
  });
});

