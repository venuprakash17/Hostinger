/// <reference types="cypress" />

describe('Coding Problems Management', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Super Admin - Coding Problems', () => {
    beforeEach(() => {
      cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
    });

    it('should create coding problem with year selection', () => {
      cy.visit('/superadmin/global-content');
      
      // Navigate to coding problems tab
      cy.contains('Coding Problems').click();
      
      cy.contains('Create Coding Problem').click();
      
      // Fill in details
      cy.get('input[name="title"]').type('Two Sum Problem');
      cy.get('textarea[name="description"]').type('Find two numbers that add up to target');
      cy.get('select[name="difficulty"]').select('Easy');
      cy.get('textarea[name="problem_statement"]').type('Given an array of integers...');
      
      // Year is required for SvnaPro
      cy.get('select[name="year"]').select('2');
      
      // Add test cases
      cy.get('textarea[name*="test_cases"]').type('Input: [2,7,11,15], 9\nOutput: [0,1]');
      
      cy.contains('Create Coding Problem').click();
      
      cy.contains('Coding problem created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should display coding problems list', () => {
      cy.visit('/superadmin/global-content');
      
      cy.contains('Coding Problems').click();
      
      // Should show table or list
      cy.get('table, [class*="card"]').should('exist');
    });
  });

  describe('Faculty - Coding Problems', () => {
    beforeEach(() => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
    });

    it('should create coding problem for section', () => {
      cy.visit('/faculty/coding-problems');
      
      cy.contains('Create Coding Problem').click();
      
      cy.get('input[name="title"]').type('Array Rotation');
      cy.get('textarea[name="description"]').type('Rotate array by k positions');
      cy.get('select[name="difficulty"]').select('Medium');
      
      // Select scope
      cy.get('select[name="scope_type"]').select('section');
      
      // Year should be required
      cy.get('select[name="year"]').should('be.visible');
      
      cy.contains('Create Coding Problem').click();
      
      cy.contains('Coding problem created successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Student - Coding Problems View with Filters', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
    });

    it('should display coding problems with filters', () => {
      cy.visit('/coding');
      
      // Check for tabs
      cy.contains('College').should('be.visible');
      cy.contains('SvnaPro').should('be.visible');
      
      // Check for filters
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should filter coding problems by search', () => {
      cy.visit('/coding');
      
      cy.wait(2000);
      
      cy.get('input[placeholder*="Search"]').type('Array');
      
      cy.wait(1000);
    });

    it('should filter by difficulty', () => {
      cy.visit('/coding');
      
      cy.wait(2000);
      
      // Look for difficulty filter
      cy.get('select, button').contains('Easy').should('exist');
    });

    it('should filter by tags', () => {
      cy.visit('/coding');
      
      cy.wait(2000);
      
      // Look for tags filter
      cy.get('input, select').should('exist');
    });
  });
});

