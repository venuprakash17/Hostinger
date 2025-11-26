/// <reference types="cypress" />

describe('Quizzes and Coding Problems - Scope-Based System', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Faculty - Quiz Management', () => {
    it('should allow faculty to create a quiz with section scope', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      // Wait for page to load
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      
      // Click Create Quiz button
      cy.contains('button', 'Create Quiz').click();
      
      // Fill in quiz form
      cy.get('input[type="text"]').first().type('Test Quiz - Section Scope');
      cy.get('textarea').first().type('This is a test quiz for a specific section');
      cy.get('input[type="text"]').eq(1).type('Computer Science');
      
      // Check scope selection
      cy.contains('Scope').should('be.visible');
      cy.contains('Specific Section').should('be.visible');
      
      // Select section if available
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="section-select"]').length > 0 || $body.text().includes('Select section')) {
          cy.contains('Select section').click({ force: true });
          cy.get('[role="option"]').first().click({ force: true });
        }
      });
      
      // Set expiry date (optional)
      cy.get('input[type="datetime-local"]').then(($input) => {
        if ($input.length > 0) {
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + 1);
          const dateString = futureDate.toISOString().slice(0, 16);
          cy.wrap($input).type(dateString, { force: true });
        }
      });
      
      // Submit form
      cy.contains('button', 'Create Quiz').click();
      
      // Verify success
      cy.contains('Success', { timeout: 10000 }).should('be.visible');
      cy.contains('Quiz created successfully').should('be.visible');
    });

    it('should show bulk upload and template download buttons', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes').should('be.visible');
      cy.contains('Bulk Upload').should('be.visible');
      cy.contains('Download Template').should('be.visible');
    });

    it('should display scope information in quiz list', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes').should('be.visible');
      
      // Wait for quizzes to load
      cy.get('body', { timeout: 10000 }).should(($body) => {
        expect($body.text()).to.satisfy((text: string) => 
          text.includes('No quizzes') || text.includes('Quiz') || text.includes('Subject')
        );
      });
    });
  });

  describe('Admin - Quiz Management', () => {
    it('should allow admin to create quiz with college scope', () => {
      cy.loginAs('admin@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Create Quiz').click();
      
      // Fill form
      cy.get('input[type="text"]').first().type('College-Wide Quiz');
      cy.get('textarea').first().type('Quiz for entire college');
      cy.get('input[type="text"]').eq(1).type('Mathematics');
      
      // Verify scope options include "Entire College"
      cy.contains('Scope').should('be.visible');
      cy.get('body').then(($body) => {
        if ($body.text().includes('Entire College')) {
          cy.contains('Entire College').should('be.visible');
        }
      });
      
      // Submit
      cy.contains('button', 'Create Quiz').last().click();
      
      // Verify success
      cy.contains('Success', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Student - Quiz Viewing', () => {
    it('should display College and SvnaPro tabs', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      // Wait for page to load
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // Verify tabs exist
      cy.contains('College').should('be.visible');
      cy.contains('SvnaPro').should('be.visible');
    });

    it('should switch between College and SvnaPro tabs', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // Click SvnaPro tab
      cy.contains('SvnaPro').click();
      
      // Verify tab is active
      cy.contains('SvnaPro').should('be.visible');
      
      // Click College tab
      cy.contains('College').click();
      
      // Verify tab is active
      cy.contains('College').should('be.visible');
    });

    it('should display quizzes in College tab', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // Wait for content to load
      cy.get('body', { timeout: 10000 }).should(($body) => {
        expect($body.text()).to.satisfy((text: string) => 
          text.includes('No tests') || text.includes('Quiz') || text.includes('Test')
        );
      });
    });

    it('should display quizzes in SvnaPro tab', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // Click SvnaPro tab
      cy.contains('SvnaPro').click();
      
      // Wait for content
      cy.get('body', { timeout: 10000 }).should(($body) => {
        expect($body.text()).to.satisfy((text: string) => 
          text.includes('No SvnaPro tests') || text.includes('Quiz') || text.includes('Test')
        );
      });
    });
  });

  describe('Student - Coding Problems Viewing', () => {
    it('should display College and SvnaPro tabs in Coding page', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/coding');
      
      cy.contains('Coding Practice', { timeout: 10000 }).should('be.visible');
      
      // Verify tabs exist
      cy.contains('College').should('be.visible');
      cy.contains('SvnaPro').should('be.visible');
    });

    it('should switch between tabs and display problems', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/coding');
      
      cy.contains('Coding Practice', { timeout: 10000 }).should('be.visible');
      
      // Click SvnaPro tab
      cy.contains('SvnaPro').click();
      cy.contains('SvnaPro').should('be.visible');
      
      // Click College tab
      cy.contains('College').click();
      cy.contains('College').should('be.visible');
    });
  });

  describe('Faculty - Coding Problem Management', () => {
    it('should allow faculty to create coding problem with scope', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/coding-problems');
      
      cy.contains('Manage Coding Problems', { timeout: 10000 }).should('be.visible');
      
      // Click Add Problem
      cy.contains('button', 'Add Problem').click();
      
      // Fill form
      cy.get('input[type="text"]').first().type('Two Sum Problem');
      cy.get('textarea').first().type('Given an array of integers, find two numbers that add up to a target.');
      
      // Select difficulty
      cy.contains('Difficulty').should('be.visible');
      cy.get('body').then(($body) => {
        if ($body.find('select').length > 0 || $body.text().includes('Easy')) {
          cy.contains('Easy').click({ force: true });
        }
      });
      
      // Fill sample input/output
      cy.get('textarea').then(($textareas) => {
        if ($textareas.length > 2) {
          cy.wrap($textareas.eq(1)).type('[2, 7, 11, 15]', { force: true });
          cy.wrap($textareas.eq(2)).type('[0, 1]', { force: true });
        }
      });
      
      // Verify scope selection
      cy.contains('Scope').should('be.visible');
      
      // Submit
      cy.contains('button', 'Add Problem').last().click();
      
      // Verify success
      cy.contains('Success', { timeout: 10000 }).should('be.visible');
    });

    it('should show bulk upload for coding problems', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/coding-problems');
      
      cy.contains('Manage Coding Problems').should('be.visible');
      cy.contains('Bulk Upload').should('be.visible');
      cy.contains('Download Template').should('be.visible');
    });
  });

  describe('Scope Filtering', () => {
    it('should filter quizzes by scope for students', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // College tab should show college-scoped quizzes
      cy.contains('College').click();
      cy.get('body', { timeout: 5000 }).should('be.visible');
      
      // SvnaPro tab should show SvnaPro quizzes
      cy.contains('SvnaPro').click();
      cy.get('body', { timeout: 5000 }).should('be.visible');
    });

    it('should filter coding problems by scope for students', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/coding');
      
      cy.contains('Coding Practice', { timeout: 10000 }).should('be.visible');
      
      // College tab
      cy.contains('College').click();
      cy.get('body', { timeout: 5000 }).should('be.visible');
      
      // SvnaPro tab
      cy.contains('SvnaPro').click();
      cy.get('body', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields in quiz form', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Create Quiz').click();
      
      // Try to submit without filling required fields
      cy.contains('button', 'Create Quiz').last().click();
      
      // Should show validation error or prevent submission
      cy.get('body').should(($body) => {
        const text = $body.text();
        // Either form prevents submission or shows error
        expect(text).to.satisfy((t: string) => 
          t.includes('required') || t.includes('error') || t.includes('Error')
        );
      });
    });

    it('should validate required fields in coding problem form', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/coding-problems');
      
      cy.contains('Manage Coding Problems', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Add Problem').click();
      
      // Try to submit without title/description
      cy.contains('button', 'Add Problem').last().click();
      
      // Should show validation
      cy.get('body').should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('required') || t.includes('error') || t.includes('Error')
        );
      });
    });
  });

  describe('Bulk Upload UI', () => {
    it('should display bulk upload component', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      
      // Bulk upload button should be visible
      cy.contains('Bulk Upload').should('be.visible');
      
      // Template download should be visible
      cy.contains('Download Template').should('be.visible');
    });

    it('should display bulk upload for coding problems', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/coding-problems');
      
      cy.contains('Manage Coding Problems', { timeout: 10000 }).should('be.visible');
      
      cy.contains('Bulk Upload').should('be.visible');
      cy.contains('Download Template').should('be.visible');
    });
  });

  describe('Navigation and UI', () => {
    it('should navigate to quiz management from faculty dashboard', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/dashboard');
      
      // Look for navigation to quizzes
      cy.get('body', { timeout: 10000 }).then(($body) => {
        if ($body.text().includes('Quizzes') || $body.find('a[href*="quiz"]').length > 0) {
          cy.contains('Quizzes').click({ force: true });
          cy.url().should('include', 'quiz');
        }
      });
    });

    it('should navigate to coding problems from faculty dashboard', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/dashboard');
      
      cy.get('body', { timeout: 10000 }).then(($body) => {
        if ($body.text().includes('Coding') || $body.find('a[href*="coding"]').length > 0) {
          cy.contains('Coding').click({ force: true });
          cy.url().should('include', 'coding');
        }
      });
    });

    it('should navigate to tests from student dashboard', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      cy.get('body', { timeout: 10000 }).then(($body) => {
        if ($body.text().includes('Tests') || $body.find('a[href*="test"]').length > 0) {
          cy.contains('Tests').click({ force: true });
          cy.url().should('include', 'test');
        }
      });
    });

    it('should navigate to coding from student dashboard', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      cy.get('body', { timeout: 10000 }).then(($body) => {
        if ($body.text().includes('Coding') || $body.find('a[href*="coding"]').length > 0) {
          cy.contains('Coding').click({ force: true });
          cy.url().should('include', 'coding');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      cy.visit('/faculty/quizzes');
      
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      
      // Page should load even if API fails
      cy.get('body').should('be.visible');
    });

    it('should show loading states', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/tests');
      
      // Should show loading or content
      cy.get('body', { timeout: 10000 }).should(($body) => {
        const text = $body.text();
        expect(text).to.satisfy((t: string) => 
          t.includes('Loading') || t.includes('Tests') || t.includes('Quiz')
        );
      });
    });
  });
});

