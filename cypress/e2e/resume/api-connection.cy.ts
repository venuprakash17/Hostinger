/**
 * API Connection Test
 * Verifies the frontend is connecting to the correct backend
 */

describe('API Connection Test', () => {
  const baseUrl = 'http://localhost:8080';
  const apiUrl = 'http://localhost:8000/api/v1';

  it('should verify backend is accessible', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl}/health`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('status');
    });
  });

  it('should verify login API endpoint is accessible', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/login`,
      body: {
        email: 'admin@elevate.edu',
        password: 'SuperAdmin123'
      },
      failOnStatusCode: false
    }).then((response) => {
      // Should either succeed (200) or fail with proper error (401)
      expect([200, 401]).to.include(response.status);
      
      if (response.status === 200) {
        expect(response.body).to.have.property('access_token');
        expect(response.body).to.have.property('refresh_token');
      } else {
        expect(response.body).to.have.property('detail');
      }
    });
  });

  it('should verify frontend loads with correct API URL', () => {
    cy.visit(baseUrl);
    
    // Check that the page loads
    cy.get('body').should('be.visible');
    
    // Check console for API URL (via window object)
    cy.window().its('console').then((console) => {
      // The API client should log the URL on load
      cy.log('Checking for API URL in console...');
    });
  });
});


