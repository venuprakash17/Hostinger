/// <reference types="cypress" />

/**
 * Comprehensive End-to-End Login Tests for All Roles
 * Tests login functionality for: Student, Faculty, HOD, Admin, Super Admin
 */

describe('All Roles Login - End to End Testing', () => {
  beforeEach(() => {
    // Clear auth state
    cy.clearAuth();
    
    // Wait for backend to be ready
    cy.waitForBackend();
  });

  describe('Student Login', () => {
    const testStudents = [
      { email: 'student1@sbit.edu', password: 'Student@123', name: 'Student 1' },
      { email: 'student2@sbit.edu', password: 'Student@123', name: 'Student 2' },
      { email: 'student1@elevate.edu', password: 'Student@123', name: 'Student 1 (Elevate)' },
    ];

    testStudents.forEach(({ email, password, name }) => {
      it(`should successfully login as ${name}`, () => {
        cy.visit('/login');
        
        // Should be on login page
        cy.url().should('include', '/login');
        
        // Fill login form (Student tab)
        cy.get('input[type="email"]').clear().type(email);
        cy.get('input[type="password"]').clear().type(password);
        
        // Submit form
        cy.get('button[type="submit"]').contains('Login').click();
        
        // Should redirect to dashboard
        cy.url({ timeout: 15000 }).should('not.include', '/login');
        cy.url().should('satisfy', (url) => {
          return url.includes('/dashboard') || url.includes('/student');
        });
        
        // Verify user is logged in
        cy.get('[data-testid="user-menu"], [aria-label*="user"], .user-menu').should('exist');
      });
    });
  });

  describe('Faculty Login', () => {
    const testFaculty = [
      { email: 'faculty1@elevate.edu', password: 'Faculty@123', name: 'Faculty 1' },
      { email: 'faculty2@elevate.edu', password: 'Faculty@123', name: 'Faculty 2' },
      { email: 'faculty.cs@sbit.edu', password: 'Faculty@123', name: 'CS Faculty' },
    ];

    testFaculty.forEach(({ email, password, name }) => {
      it(`should successfully login as ${name}`, () => {
        cy.visit('/login');
        
        // Should be on login page
        cy.url().should('include', '/login');
        
        // Switch to Faculty/Admin tab if exists
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Faculty"), button:contains("Admin"), [role="tab"]').length > 0) {
            cy.contains('button', 'Faculty').click({ force: true });
            cy.wait(500);
          }
        });
        
        // Fill login form
        cy.get('input[type="email"]').clear().type(email);
        cy.get('input[type="password"]').clear().type(password);
        
        // Submit form
        cy.get('button[type="submit"]').contains('Login').click();
        
        // Should redirect to faculty dashboard
        cy.url({ timeout: 15000 }).should('not.include', '/login');
        cy.url().should('satisfy', (url) => {
          return url.includes('/faculty') || url.includes('/dashboard');
        });
        
        // Verify user is logged in
        cy.get('[data-testid="user-menu"], [aria-label*="user"], .user-menu').should('exist');
      });
    });
  });

  describe('HOD Login', () => {
    const testHODs = [
      { email: 'hod.cs@elevate.edu', password: 'Hod@123', name: 'CS HOD' },
    ];

    testHODs.forEach(({ email, password, name }) => {
      it(`should successfully login as ${name}`, () => {
        cy.visit('/login');
        
        // Should be on login page
        cy.url().should('include', '/login');
        
        // Switch to Faculty/Admin tab if exists
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Faculty"), button:contains("Admin"), [role="tab"]').length > 0) {
            cy.contains('button', 'Faculty').click({ force: true });
            cy.wait(500);
          }
        });
        
        // Fill login form
        cy.get('input[type="email"]').clear().type(email);
        cy.get('input[type="password"]').clear().type(password);
        
        // Submit form
        cy.get('button[type="submit"]').contains('Login').click();
        
        // Should redirect to faculty/HOD dashboard
        cy.url({ timeout: 15000 }).should('not.include', '/login');
        cy.url().should('satisfy', (url) => {
          return url.includes('/faculty') || url.includes('/dashboard');
        });
        
        // Verify user is logged in
        cy.get('[data-testid="user-menu"], [aria-label*="user"], .user-menu').should('exist');
        
        // Verify HOD can access coding labs
        cy.visit('/coding-labs');
        cy.url().should('include', '/coding-labs');
        cy.contains('Create Lab').should('be.visible');
      });
    });
  });

  describe('Admin Login', () => {
    const testAdmins = [
      { email: 'admin@elevate.edu', password: 'Admin@123', name: 'College Admin' },
      { email: 'admin@sbit.edu', password: 'CollegeAdmin@123', name: 'SBIT Admin' },
    ];

    testAdmins.forEach(({ email, password, name }) => {
      it(`should successfully login as ${name}`, () => {
        cy.visit('/login');
        
        // Should be on login page
        cy.url().should('include', '/login');
        
        // Switch to Faculty/Admin tab if exists
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Faculty"), button:contains("Admin"), [role="tab"]').length > 0) {
            cy.contains('button', 'Faculty').click({ force: true });
            cy.wait(500);
          }
        });
        
        // Fill login form
        cy.get('input[type="email"]').clear().type(email);
        cy.get('input[type="password"]').clear().type(password);
        
        // Submit form
        cy.get('button[type="submit"]').contains('Login').click();
        
        // Should redirect to admin dashboard
        cy.url({ timeout: 15000 }).should('not.include', '/login');
        cy.url().should('satisfy', (url) => {
          return url.includes('/admin') || url.includes('/dashboard');
        });
        
        // Verify user is logged in
        cy.get('[data-testid="user-menu"], [aria-label*="user"], .user-menu').should('exist');
      });
    });
  });

  describe('Super Admin Login', () => {
    const testSuperAdmins = [
      { email: 'superadmin@elevate.edu', password: 'SuperAdmin@123', name: 'Super Admin' },
      { email: 'superadmin2@elevate.edu', password: 'SuperAdmin@123', name: 'Super Admin 2' },
    ];

    testSuperAdmins.forEach(({ email, password, name }) => {
      it(`should successfully login as ${name}`, () => {
        cy.visit('/login');
        
        // Should be on login page
        cy.url().should('include', '/login');
        
        // Switch to Faculty/Admin tab if exists
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Faculty"), button:contains("Admin"), [role="tab"]').length > 0) {
            cy.contains('button', 'Faculty').click({ force: true });
            cy.wait(500);
          }
        });
        
        // Fill login form
        cy.get('input[type="email"]').clear().type(email);
        cy.get('input[type="password"]').clear().type(password);
        
        // Submit form
        cy.get('button[type="submit"]').contains('Login').click();
        
        // Should redirect to super admin dashboard
        cy.url({ timeout: 15000 }).should('not.include', '/login');
        cy.url().should('satisfy', (url) => {
          return url.includes('/superadmin') || url.includes('/admin');
        });
        
        // Verify user is logged in
        cy.get('[data-testid="user-menu"], [aria-label*="user"], .user-menu').should('exist');
      });
    });
  });

  describe('Invalid Login Attempts', () => {
    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').clear().type('invalid@example.com');
      cy.get('input[type="password"]').clear().type('wrongpassword');
      cy.get('button[type="submit"]').contains('Login').click();
      
      // Should show error message
      cy.contains(/invalid|incorrect|error|failed/i, { timeout: 10000 }).should('be.visible');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should show error for empty fields', () => {
      cy.visit('/login');
      
      cy.get('button[type="submit"]').contains('Login').click();
      
      // Should show validation error
      cy.get('body').should('satisfy', ($body) => {
        return $body.text().includes('required') || 
               $body.find('[role="alert"]').length > 0 ||
               $body.find('.error').length > 0;
      });
    });
  });

  describe('Login Flow Verification', () => {
    it('should redirect authenticated users away from login page', () => {
      // Login first
      cy.loginAs('student1@sbit.edu', 'Student@123', 'student');
      
      // Try to visit login page
      cy.visit('/login');
      
      // Should redirect away from login
      cy.url({ timeout: 5000 }).should('not.include', '/login');
    });

    it('should allow logout and return to login', () => {
      // Login first
      cy.loginAs('student1@sbit.edu', 'Student@123', 'student');
      
      // Logout
      cy.get('body').then(($body) => {
        // Try different logout selectors
        const logoutSelectors = [
          'button:contains("Logout")',
          'button:contains("Sign Out")',
          '[data-testid="logout"]',
          '[aria-label*="logout"]',
          '.logout-button'
        ];
        
        let found = false;
        logoutSelectors.forEach(selector => {
          if ($body.find(selector).length > 0 && !found) {
            cy.get(selector).first().click({ force: true });
            found = true;
          }
        });
        
        // If no logout button found, clear auth manually
        if (!found) {
          cy.clearAuth();
        }
      });
      
      // Should redirect to login
      cy.url({ timeout: 5000 }).should('include', '/login');
    });
  });
});

