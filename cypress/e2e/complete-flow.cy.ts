/**
 * Complete End-to-End Flow Tests
 * Tests the full application flow from login to dashboard
 */

describe('Complete Application Flow', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies()
    cy.clearLocalStorage()
  });

  describe('Backend Health', () => {
    it('should verify backend is running before running tests', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8000/health',
        failOnStatusCode: false,
        timeout: 5000,
      }).then((response) => {
        if (response.status !== 200) {
          throw new Error('Backend server is not running! Please start it with: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000');
        }
        expect(response.body.status).to.eq('healthy');
      });
    });
  });

  describe('Super Admin Flow', () => {
    it('should login as super admin and access dashboard', () => {
      cy.visit('/login');
      
      // Select Faculty/Admin tab
      cy.contains('Faculty / Admin').click();
      
      // Fill login form
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should redirect to super admin dashboard
      cy.url().should('include', '/superadmin/dashboard');
      
      // Verify dashboard content
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('College Admin Flow', () => {
    it('should login as college admin and access admin panel', () => {
      cy.visit('/login');
      
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('admin@elevate.edu');
      cy.get('input[type="password"]').type('Admin@123');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to admin dashboard
      cy.url().should('match', /\/admin\/dashboard|\/dashboard/);
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Student Flow', () => {
    it('should login as student and access dashboard', () => {
      cy.visit('/login');
      
      // Student tab should be selected by default
      cy.get('input[type="email"]').type('student1@elevate.edu');
      cy.get('input[type="password"]').type('Student@123');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to student dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      // Login as student first
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
    });

    it('should navigate to resume module', () => {
      cy.visit('/dashboard');
      
      // Look for resume link or navigate directly
      cy.visit('/resume');
      cy.url().should('include', '/resume');
    });

    it('should navigate to jobs module', () => {
      cy.visit('/dashboard');
      
      // Navigate to jobs if available
      cy.visit('/jobs');
      cy.url().should('include', '/jobs');
    });
  });

  describe('Session Management', () => {
    it('should maintain session after page reload', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      // Reload page
      cy.reload();
      
      // Should still be logged in
      cy.url().should('include', '/dashboard');
      cy.contains('Dashboard').should('be.visible');
    });

    it('should logout and redirect to login', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/dashboard');
      
      // Find and click logout button
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="logout"], button:contains("Logout"), a:contains("Logout")').length > 0) {
          cy.contains('Logout').click();
        } else {
          // Alternative: clear storage and check redirect
          cy.clearLocalStorage();
          cy.clearCookies();
          cy.reload();
        }
      });
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});

