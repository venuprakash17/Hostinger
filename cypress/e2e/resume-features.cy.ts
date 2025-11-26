/// <reference types="cypress" />

describe('Resume Features - ATS Score & Cover Letter', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('ATS Score', () => {
    it('should calculate ATS score for resume', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      cy.contains('Resume Builder', { timeout: 10000 }).should('be.visible');
      
      // Click ATS Score tab
      cy.contains('ATS Score').click();
      
      // Enter resume text
      cy.get('textarea').first().type('John Doe\nSoftware Engineer\n5 years experience\nSkills: Python, JavaScript, React');
      
      // Enter job description (optional)
      cy.get('textarea').eq(1).type('Looking for a software engineer with Python and React experience');
      
      // Click analyze button
      cy.contains('button', 'Analyze Resume').click();
      
      // Verify score is displayed
      cy.contains('Overall ATS Score', { timeout: 10000 }).should('be.visible');
      cy.get('[class*="text-4xl"]').should('be.visible'); // Score number
    });

    it('should display score breakdown and recommendations', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      cy.contains('ATS Score').click();
      
      // Analyze resume
      cy.get('textarea').first().type('Test resume content');
      cy.contains('button', 'Analyze Resume').click();
      
      // Wait for results
      cy.wait(3000);
      
      // Check for breakdown
      cy.contains('Category Scores', { timeout: 10000 }).should('be.visible');
      cy.contains('Recommendations').should('be.visible');
    });
  });

  describe('Cover Letter Generator', () => {
    it('should generate a cover letter', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Click Cover Letter tab
      cy.contains('Cover Letter').click();
      
      // Fill form
      cy.get('input[type="text"]').first().type('Google');
      cy.get('input[type="text"]').eq(1).type('Software Engineer');
      cy.get('textarea').first().type('I am interested in this role because...');
      cy.get('textarea').eq(1).type('Job description: Looking for experienced software engineer...');
      
      // Generate
      cy.contains('button', 'Generate Cover Letter').click();
      
      // Verify cover letter is generated
      cy.contains('Generated Cover Letter', { timeout: 10000 }).should('be.visible');
    });

    it('should allow copying and downloading cover letter', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      cy.contains('Cover Letter').click();
      
      // Generate cover letter first
      cy.get('input[type="text"]').first().type('Microsoft');
      cy.get('input[type="text"]').eq(1).type('Developer');
      cy.contains('button', 'Generate Cover Letter').click();
      
      cy.wait(3000);
      
      // Check for copy and download buttons
      cy.contains('button', 'Copy').should('be.visible');
      cy.contains('button', 'Download').should('be.visible');
    });
  });
});

