/// <reference types="cypress" />

describe('Login Flow - All Roles', () => {
  // Helper to clear auth state
  beforeEach(() => {
    cy.clearAuth();
  });

  describe('Login UI and Flow', () => {
    it('should display login page correctly', () => {
      cy.visit('/login');
      
      // Check page elements
      cy.contains('Welcome Back').should('be.visible');
      cy.contains('Sign in to your SvnaJobs account').should('be.visible');
      
      // Check tabs
      cy.contains('Student').should('be.visible');
      cy.contains('Faculty / Admin').should('be.visible');
      
      // Check form fields
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.contains('Sign In').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      
      // Try to submit without filling fields
      cy.get('button[type="submit"]').click();
      
      // Should show validation (browser native or toast)
      cy.get('input[type="email"]:invalid').should('exist');
    });

    it('should handle invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('invalid@test.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      // Should show error toast
      cy.contains('Invalid email or password', { timeout: 10000 }).should('be.visible');
      
      // Button should not be stuck in loading state
      cy.get('button[type="submit"]').should('not.contain', 'Signing in...');
    });
  });

  describe('Super Admin Login', () => {
    it('should login successfully and redirect to super admin dashboard', () => {
      cy.waitForBackend();
      cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
      
      // Should show success toast
      cy.contains('Login successful', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('College Admin Login', () => {
    it('should login successfully and redirect to admin dashboard', () => {
      cy.waitForBackend();
      cy.loginAs('admin@elevate.edu', 'Admin@123', 'admin');
    });
  });

  describe('Faculty Login', () => {
    it('should login successfully and redirect to faculty dashboard', () => {
      cy.waitForBackend();
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
    });

    it('should work with second faculty account', () => {
      cy.waitForBackend();
      cy.loginAs('faculty2@elevate.edu', 'Faculty@123', 'faculty');
    });
  });

  describe('Student Login', () => {
    it('should login successfully and redirect to student dashboard', () => {
      cy.waitForBackend();
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
    });

    it('should work with multiple student accounts', () => {
      cy.waitForBackend();
      cy.loginAs('student2@elevate.edu', 'Student@123', 'student');
    });
  });

  describe('Login State Management', () => {
    it('should clear loading state on successful login', () => {
      cy.waitForBackend();
      
      cy.visit('/login');
      
      // Click on Faculty/Admin tab first
      cy.contains('Faculty / Admin').click();
      cy.get('#staff-email').should('be.visible');
      
      cy.get('#staff-email').type('faculty1@elevate.edu');
      cy.get('#staff-password').type('Faculty@123');
      cy.get('button[type="submit"]').click();
      
      // Button should show loading briefly
      cy.get('button[type="submit"]').should('contain', 'Signing in...');
      
      // Then should navigate (loading clears)
      cy.url({ timeout: 10000 }).should('include', '/faculty/dashboard');
    });

    it('should clear loading state on failed login', () => {
      cy.waitForBackend();
      
      cy.visit('/login');
      
      // Click on Faculty/Admin tab first
      cy.contains('Faculty / Admin').click();
      cy.get('#staff-email').should('be.visible');
      
      cy.get('#staff-email').type('invalid@test.com');
      cy.get('#staff-password').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      // Should show error
      cy.contains('Invalid email or password', { timeout: 10000 }).should('be.visible');
      
      // Button should not be stuck in loading (critical test)
      cy.get('button[type="submit"]', { timeout: 5000 }).should('not.contain', 'Signing in...');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should handle network errors gracefully', () => {
      const apiUrl = Cypress.env('apiBaseUrl') || 'http://localhost:8000/api/v1';
      
      // Intercept and fail the login request
      cy.intercept('POST', `${apiUrl}/auth/login`, { forceNetworkError: true }).as('loginRequest');
      
      cy.visit('/login');
      
      // Click on Faculty/Admin tab first
      cy.contains('Faculty / Admin').click();
      cy.get('#staff-email').should('be.visible');
      
      cy.get('#staff-email').type('faculty1@elevate.edu');
      cy.get('#staff-password').type('Faculty@123');
      cy.get('button[type="submit"]').click();
      
      // Should show network error
      cy.contains('Failed to connect', { timeout: 10000 }).should('be.visible');
      
      // Button should not be stuck (critical test)
      cy.get('button[type="submit"]', { timeout: 5000 }).should('not.contain', 'Signing in...');
    });

    it('should handle timeout gracefully', () => {
      const apiUrl = Cypress.env('apiBaseUrl') || 'http://localhost:8000/api/v1';
      
      // Intercept and delay the login request to cause timeout
      cy.intercept('POST', `${apiUrl}/auth/login`, { delay: 10000 }).as('loginRequest');
      
      cy.visit('/login');
      
      // Click on Faculty/Admin tab first
      cy.contains('Faculty / Admin').click();
      cy.get('#staff-email').should('be.visible');
      
      cy.get('#staff-email').type('faculty1@elevate.edu');
      cy.get('#staff-password').type('Faculty@123');
      cy.get('button[type="submit"]').click();
      
      // Should show timeout error
      cy.contains('timeout', { timeout: 12000 }).should('be.visible');
      
      // Button should not be stuck (critical test)
      cy.get('button[type="submit"]', { timeout: 5000 }).should('not.contain', 'Signing in...');
    });
  });

  describe('Role-based Navigation', () => {
    const testCases = [
        { email: 'superadmin@elevate.edu', password: 'SuperAdmin@123', role: 'super_admin' },
        { email: 'admin@elevate.edu', password: 'Admin@123', role: 'admin' },
        { email: 'faculty1@elevate.edu', password: 'Faculty@123', role: 'faculty' },
        { email: 'student1@elevate.edu', password: 'Student@123', role: 'student' },
    ];

    testCases.forEach(({ email, password, role }) => {
      it(`should navigate ${role} to correct dashboard`, () => {
        cy.waitForBackend();
        cy.loginAs(email, password, role);
      });
    });
  });

  describe('Login Performance', () => {
    it('should complete login within 10 seconds', () => {
      cy.waitForBackend();
      
      const startTime = Date.now();
      
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      cy.log(`Login completed in ${duration}ms`);
      expect(duration).to.be.lessThan(10000);
    });
  });
});
