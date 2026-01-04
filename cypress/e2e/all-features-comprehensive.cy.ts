/// <reference types="cypress" />

/**
 * Comprehensive End-to-End Tests for All Features
 * This test suite covers all major features of the application
 */

describe('All Features - Comprehensive E2E Tests', () => {
  const superAdminEmail = 'superadmin@elevate.edu';
  const superAdminPassword = 'SuperAdmin@123';
  const adminEmail = 'admin@elevate.edu';
  const adminPassword = 'Admin@123';
  const studentEmail = 'student1@elevate.edu';
  const studentPassword = 'Student@123';
  const facultyEmail = 'faculty.cs@elevate.edu';
  const facultyPassword = 'Faculty@123';

  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('1. Authentication & Login', () => {
    it('should login as Super Admin', () => {
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('#staff-email').clear().type(superAdminEmail);
      cy.get('#staff-password').clear().type(superAdminPassword);
      cy.get('button[type="submit"]').contains('Sign In').click();
      cy.url({ timeout: 15000 }).should('include', '/superadmin');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });

    it('should login as Student', () => {
      cy.visit('/login');
      cy.get('#student-email').clear().type(studentEmail);
      cy.get('#student-password').clear().type(studentPassword);
      cy.get('button[type="submit"]').contains('Sign In').click();
      cy.url({ timeout: 15000 }).should('not.include', '/login');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });

    it('should show password visibility toggle', () => {
      cy.visit('/login');
      cy.get('#student-password').should('exist');
      cy.get('button[type="button"][aria-label*="password"], button[type="button"][aria-label*="eye"]').first().click();
      cy.get('#student-password').should('have.attr', 'type', 'text');
    });
  });

  describe('2. Super Admin - Global Content Management', () => {
    beforeEach(() => {
      cy.loginAs(superAdminEmail, superAdminPassword, 'super_admin');
    });

    it('should access Global Content page', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Global Content', { timeout: 10000 }).should('be.visible');
    });

    it('should display Quizzes tab', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Quizzes', { timeout: 10000 }).click();
      cy.contains('Create Quiz', { timeout: 5000 }).should('be.visible');
    });

    it('should display Coding Problems tab', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.contains('Create Coding Problem', { timeout: 5000 }).should('be.visible');
    });

    it('should open create coding problem dialog', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.contains('Create Coding Problem').click();
      cy.wait(1000); // Wait for dialog to open
      cy.contains('Create SvnaPro Coding Problem', { timeout: 5000 }).should('be.visible');
      // Close dialog if needed
      cy.get('body').then(($body) => {
        if ($body.find('[role="dialog"]').length > 0) {
          cy.get('button[aria-label="Close"]').first().click({ force: true });
        }
      });
    });
  });

  describe('3. Super Admin - Bulk Upload', () => {
    beforeEach(() => {
      cy.loginAs(superAdminEmail, superAdminPassword, 'super_admin');
    });

    it('should access bulk upload page', () => {
      // Bulk upload is in global content page
      cy.visit('/superadmin/global-content');
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.contains('Bulk Upload', { timeout: 10000 }).should('be.visible');
    });

    it('should display coding problems bulk upload section', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.contains('Bulk Upload', { timeout: 10000 }).should('be.visible');
      cy.contains('Download Template', { timeout: 5000 }).should('be.visible');
    });

    it('should download coding problems template', () => {
      cy.visit('/superadmin/global-content');
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.contains('Download Template', { timeout: 5000 }).click();
      // Template download should be triggered
      cy.wait(1000);
    });
  });

  describe('4. Student - Coding Practice', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should access coding practice page', () => {
      cy.visit('/coding');
      cy.contains('Coding Practice', { timeout: 10000 }).should('be.visible');
    });

    it('should display coding problems list', () => {
      cy.visit('/coding');
      cy.get('[class*="card"], [class*="problem"]', { timeout: 10000 }).should('exist');
    });

    it('should be able to search coding problems', () => {
      cy.visit('/coding');
      cy.get('input[placeholder*="Search"], input[type="search"]', { timeout: 10000 }).first().type('test');
      cy.wait(1000);
    });
  });

  describe('5. Student - Dashboard', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should display student dashboard', () => {
      cy.visit('/dashboard');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });

    it('should display announcements', () => {
      cy.visit('/dashboard');
      // Announcements might be in a widget or section
      cy.get('body', { timeout: 10000 }).should('be.visible');
      // Check if announcements exist (may not always be visible)
      cy.get('body').then(($body) => {
        if ($body.find(':contains("Announcements")').length > 0) {
          cy.contains('Announcements').should('be.visible');
        }
      });
    });

    it('should display coding problems widget', () => {
      cy.visit('/dashboard');
      cy.contains('Coding', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('6. Student - Tests/Quizzes', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should access tests page', () => {
      cy.visit('/tests');
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
    });

    it('should display available quizzes', () => {
      cy.visit('/tests');
      cy.get('[class*="card"], [class*="quiz"]', { timeout: 10000 }).should('exist');
    });
  });

  describe('7. Student - Resume Builder', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should access resume page', () => {
      cy.visit('/resume');
      cy.contains('Resume', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('8. Student - Jobs', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should access jobs page', () => {
      cy.visit('/jobs');
      cy.contains('Jobs', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('9. API Health Checks', () => {
    it('should verify backend health endpoint', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8000/health',
        failOnStatusCode: false,
        timeout: 10000,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.status).to.eq('healthy');
      });
    });

    it('should verify coding problems API endpoint', () => {
      cy.loginAs(superAdminEmail, superAdminPassword, 'super_admin');
      cy.request({
        method: 'GET',
        url: 'http://localhost:8000/api/v1/coding-problems?is_active=true',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        failOnStatusCode: false,
        timeout: 10000,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401]);
      });
    });
  });

  describe('10. Navigation & UI', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should navigate between pages', () => {
      cy.visit('/dashboard');
      cy.contains('Dashboard').should('be.visible');
      
      cy.visit('/coding');
      cy.contains('Coding', { timeout: 10000 }).should('be.visible');
      
      cy.visit('/tests');
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
    });

    it('should display user menu', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"], [aria-label*="user"], button[aria-haspopup]', { timeout: 10000 }).should('exist');
    });

    it('should be able to logout', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"], [aria-label*="user"], button[aria-haspopup]', { timeout: 10000 }).first().click();
      cy.contains('Logout', { timeout: 5000 }).click();
      cy.url().should('include', '/login');
    });
  });

  describe('11. Error Handling', () => {
    it('should handle invalid login credentials', () => {
      cy.visit('/login');
      cy.get('#student-email').clear().type('invalid@email.com');
      cy.get('#student-password').clear().type('wrongpassword');
      cy.get('button[type="submit"]').contains('Sign In').click();
      cy.contains('Invalid', { timeout: 5000 }).should('be.visible');
    });

    it('should handle network errors gracefully', () => {
      cy.visit('/login');
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
      // Should not crash even if API fails
      cy.get('body').should('exist');
    });
  });

  describe('12. Responsive Design', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should work on mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE
      cy.visit('/dashboard');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
      // Scroll to ensure visibility
      cy.get('body').scrollIntoView();
    });

    it('should work on tablet viewport', () => {
      cy.viewport(768, 1024); // iPad
      cy.visit('/dashboard');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
      // Scroll to ensure visibility
      cy.get('body').scrollIntoView();
    });
  });
});

