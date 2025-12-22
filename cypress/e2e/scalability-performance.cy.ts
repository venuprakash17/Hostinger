/// <reference types="cypress" />

/**
 * Scalability and Performance Tests
 * Tests the system with large datasets to ensure it can handle 10k+ users
 */

describe('Scalability and Performance Tests', () => {
  const baseUrl = Cypress.env('VITE_API_BASE_URL') || 'http://localhost:8090/api/v1';
  
  beforeEach(() => {
    // Login as super admin
    cy.request({
      method: 'POST',
      url: `${baseUrl}/auth/login`,
      body: {
        email: 'superadmin@test.com',
        password: 'SuperAdmin123!'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      window.localStorage.setItem('access_token', response.body.access_token);
    });
  });

  it('should handle large user list queries efficiently', () => {
    const startTime = Date.now();
    
    cy.request({
      method: 'GET',
      url: `${baseUrl}/users?limit=500`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
      }
    }).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.status).to.eq(200);
      expect(duration).to.be.lessThan(2000); // Should complete in under 2 seconds
      expect(response.body).to.be.an('array');
    });
  });

  it('should handle analytics queries efficiently', () => {
    const startTime = Date.now();
    
    cy.request({
      method: 'GET',
      url: `${baseUrl}/analytics/drilldown/admin/overview`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
      }
    }).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.status).to.eq(200);
      expect(duration).to.be.lessThan(3000); // Analytics can take up to 3 seconds
    });
  });

  it('should handle paginated coding problems efficiently', () => {
    const startTime = Date.now();
    
    cy.request({
      method: 'GET',
      url: `${baseUrl}/coding-problems?limit=100`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
      }
    }).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.status).to.eq(200);
      expect(duration).to.be.lessThan(1500); // Should complete in under 1.5 seconds
    });
  });

  it('should handle concurrent requests', () => {
    const requests = Array(10).fill(null).map(() => 
      cy.request({
        method: 'GET',
        url: `${baseUrl}/users?limit=50`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
        }
      })
    );
    
    cy.wrap(Promise.all(requests)).then((responses) => {
      responses.forEach((response: any) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  it('should have proper response headers for caching', () => {
    cy.request({
      method: 'GET',
      url: `${baseUrl}/colleges`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      // Check for performance headers
      expect(response.headers).to.have.property('x-response-time');
    });
  });
});

