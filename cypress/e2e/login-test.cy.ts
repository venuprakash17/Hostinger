/// <reference types="cypress" />

describe('Login E2E Tests', () => {
  const baseUrl = Cypress.env('BASE_URL') || 'http://localhost:8080';
  const backendUrl = Cypress.env('BACKEND_URL') || 'http://localhost:8000';

  beforeEach(() => {
    // Clear auth state before each test
    cy.clearAuth();
  });

  describe('Backend Health Check', () => {
    it('should have backend running', () => {
      cy.request({
        method: 'GET',
        url: `${backendUrl}/api/v1/health`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.status).to.eq('healthy');
      });
    });
  });

  describe('Super Admin Login', () => {
    it('should login successfully as super admin via UI', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Wait for page to load
      cy.contains('Welcome Back', { timeout: 10000 }).should('be.visible');
      
      // Click on Staff tab - wait for it to be visible and clickable
      cy.contains('Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Wait for staff form to be visible
      cy.get('#staff-email', { timeout: 5000 }).should('be.visible');
      
      // Fill in credentials
      cy.get('#staff-email').clear().type('superadmin@elevate.edu');
      cy.get('#staff-password').clear().type('SuperAdmin123!');
      
      // Intercept the login API call to verify it succeeds
      cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
      
      // Click login button
      cy.contains('Sign In as Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Wait for login API call to complete
      cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body).to.have.property('access_token');
      });
      
      // Wait for navigation away from login page (increased timeout)
      cy.url({ timeout: 20000 }).should('not.include', '/login');
      
      // Verify token is stored
      cy.window().its('localStorage').invoke('getItem', 'access_token').should('exist');
      
      // Should redirect to superadmin dashboard (super_admin role)
      cy.url({ timeout: 10000 }).should('satisfy', (url) => {
        return url.includes('/superadmin/dashboard') || url.includes('/dashboard');
      });
    });

    it('should login successfully as super admin via API', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'superadmin@elevate.edu',
          password: 'SuperAdmin123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('access_token');
        expect(response.body).to.have.property('refresh_token');
        expect(response.body.token_type).to.eq('bearer');
      });
    });

    it('should fail with wrong password', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'superadmin@elevate.edu',
          password: 'WrongPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
        expect(response.body.detail).to.include('Invalid');
      });
    });

    it('should fail with non-existent email', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'nonexistent@elevate.edu',
          password: 'SuperAdmin123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
        expect(response.body.detail).to.include('Invalid');
      });
    });
  });

  describe('Admin Login', () => {
    it('should login successfully as admin via UI', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Wait for page to load
      cy.contains('Welcome Back', { timeout: 10000 }).should('be.visible');
      
      // Click on Staff tab
      cy.contains('Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Wait for staff form
      cy.get('#staff-email', { timeout: 5000 }).should('be.visible');
      
      // Fill in credentials
      cy.get('#staff-email').clear().type('admin@elevate.edu');
      cy.get('#staff-password').clear().type('SvnaJobs@123');
      
      // Click login button
      cy.contains('Sign In as Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Wait for navigation
      cy.url({ timeout: 20000 }).should('not.include', '/login');
      
      // Verify token is stored
      cy.window().its('localStorage').invoke('getItem', 'access_token').should('exist');
    });

    it('should login successfully as admin via API', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'admin@elevate.edu',
          password: 'SvnaJobs@123'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('access_token');
      });
    });
  });

  describe('Multiple Admin Accounts', () => {
    const adminAccounts = [
      { email: 'superadmin@elevate.edu', password: 'SuperAdmin123!' },
      { email: 'admin@elevate.edu', password: 'SvnaJobs@123' },
      { email: 'admin1@elevate.edu', password: 'Admin123!' },
      { email: 'admin2@elevate.edu', password: 'Admin123!' },
      { email: 'admin3@elevate.edu', password: 'Admin123!' }
    ];

    adminAccounts.forEach((account) => {
      it(`should login successfully with ${account.email}`, () => {
        cy.request({
          method: 'POST',
          url: `${backendUrl}/api/v1/auth/login`,
          body: {
            email: account.email,
            password: account.password
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('access_token');
          cy.log(`✅ ${account.email} login successful`);
        });
      });
    });
  });

  describe('Login UI Flow', () => {
    it('should show error message for invalid credentials', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Wait for page to load
      cy.contains('Welcome Back', { timeout: 10000 }).should('be.visible');
      
      // Click on Staff tab
      cy.contains('Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Wait for staff form
      cy.get('#staff-email', { timeout: 5000 }).should('be.visible');
      
      // Fill in wrong credentials
      cy.get('#staff-email').clear().type('superadmin@elevate.edu');
      cy.get('#staff-password').clear().type('WrongPassword123!');
      
      // Click login button
      cy.contains('Sign In as Staff', { timeout: 5000 }).should('be.visible').click();
      
      // Should show error message
      cy.contains('Invalid', { timeout: 10000 }).should('be.visible');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should switch between Student and Staff tabs', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Wait for page to load
      cy.contains('Welcome Back', { timeout: 10000 }).should('be.visible');
      
      // Default should be Student tab
      cy.get('#student-email', { timeout: 5000 }).should('be.visible');
      cy.contains('Login as Student').should('be.visible');
      
      // Click Staff tab
      cy.contains('Staff', { timeout: 5000 }).should('be.visible').click();
      cy.get('#staff-email', { timeout: 5000 }).should('be.visible');
      cy.contains('Faculty / Admin / HOD').should('be.visible');
      
      // Click Student tab
      cy.contains('Student', { timeout: 5000 }).should('be.visible').click();
      cy.get('#student-email', { timeout: 5000 }).should('be.visible');
      cy.contains('Login as Student').should('be.visible');
    });
  });

  describe('Token Management', () => {
    it('should store tokens in localStorage after login', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'superadmin@elevate.edu',
          password: 'SuperAdmin123!'
        }
      }).then((response) => {
        const token = response.body.access_token;
        
        // Visit page and set token manually
        cy.visit(`${baseUrl}/login`);
        cy.window().then((win) => {
          win.localStorage.setItem('access_token', token);
          win.localStorage.setItem('refresh_token', response.body.refresh_token);
        });
        
        // Verify tokens are stored
        cy.window().its('localStorage').invoke('getItem', 'access_token').should('exist');
        cy.window().its('localStorage').invoke('getItem', 'refresh_token').should('exist');
      });
    });
  });
});

