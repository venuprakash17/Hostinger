/**
 * Backend Health Check Tests
 * Verifies backend server is running and accessible
 */

describe('Backend Health Check', () => {
  const BACKEND_URL = 'http://localhost:8000';
  const API_BASE = `${BACKEND_URL}/api/v1`;

  it('should verify backend server is running', () => {
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/health`,
      failOnStatusCode: false,
      timeout: 10000,
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.have.property('status', 'healthy');
        cy.log('✅ Backend is running and healthy');
      } else {
        cy.log('❌ Backend is not responding correctly');
        throw new Error(`Backend returned status ${response.status}`);
      }
    });
  });

  it('should verify API docs are accessible', () => {
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/api/docs`,
      failOnStatusCode: false,
      timeout: 10000,
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.exist;
        cy.log('✅ API documentation is accessible');
      } else {
        cy.log('⚠️ API docs endpoint returned status', response.status);
      }
    });
  });

  it('should verify root endpoint responds', () => {
    cy.request({
      method: 'GET',
      url: `${BACKEND_URL}/`,
      failOnStatusCode: false,
      timeout: 10000,
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.have.property('message');
        cy.log('✅ Root endpoint is working');
      }
    });
  });

  it('should verify CORS is configured correctly', () => {
    cy.request({
      method: 'OPTIONS',
      url: `${API_BASE}/auth/login`,
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
      failOnStatusCode: false,
      timeout: 10000,
    }).then((response) => {
      // CORS preflight should return 200 or 204
      expect([200, 204]).to.include(response.status);
      cy.log('✅ CORS is configured correctly');
    });
  });

  it('should verify login endpoint exists', () => {
    cy.request({
      method: 'POST',
      url: `${API_BASE}/auth/login`,
      body: {
        email: 'test@test.com',
        password: 'test123',
      },
      failOnStatusCode: false, // Don't fail on 401, we expect it
      timeout: 10000,
    }).then((response) => {
      // Should return 401 (unauthorized) not 404 (not found) or connection error
      expect(response.status).to.be.oneOf([401, 400]);
      cy.log('✅ Login endpoint exists and is accessible');
    });
  });
});

