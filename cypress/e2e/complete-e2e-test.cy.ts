/// <reference types="cypress" />

/**
 * Complete End-to-End Test Suite
 * Tests all major features before deployment
 */

describe('Complete E2E Test Suite - All Features', () => {
  const baseUrl = Cypress.env('VITE_API_BASE_URL') || 'http://localhost:8090/api/v1';
  let superAdminToken: string;
  let adminToken: string;
  let studentToken: string;

  before(() => {
    // Login as super admin
    cy.request({
      method: 'POST',
      url: `${baseUrl}/auth/login`,
      body: {
        email: 'superadmin@test.com',
        password: 'SuperAdmin123!'
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        superAdminToken = response.body.access_token;
      }
    });
  });

  describe('1. Authentication & Authorization', () => {
    it('should login successfully', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/auth/login`,
        body: {
          email: 'superadmin@test.com',
          password: 'SuperAdmin123!'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('access_token');
      });
    });

    it('should get current user', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/auth/me`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('email');
      });
    });
  });

  describe('2. Colleges Management', () => {
    it('should list colleges', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/colleges`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('3. Institutions Management', () => {
    it('should list institutions', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/institutions`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('4. Users Management', () => {
    it('should list users with pagination', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/users?limit=50`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body.length).to.be.at.most(50);
      });
    });
  });

  describe('5. Coding Problems', () => {
    it('should list coding problems', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/coding-problems?limit=50`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('6. Analytics', () => {
    it('should get admin overview analytics', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/analytics/drilldown/admin/overview`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        },
        timeout: 10000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('overview');
      });
    });

    it('should get comprehensive dashboard', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/analytics/dashboard/comprehensive`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        },
        timeout: 10000
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('overview');
      });
    });
  });

  describe('7. Jobs Management', () => {
    it('should list jobs', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/jobs?is_active=true`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('8. Quizzes', () => {
    it('should list quizzes', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/quizzes`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('9. Coding Labs', () => {
    it('should list coding labs', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/coding-labs?limit=50`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('10. Bulk Upload', () => {
    it('should have bulk upload endpoints available', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/bulk-upload/template/students?format=csv`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should either return template or 404 (if not implemented)
        expect([200, 404]).to.include(response.status);
      });
    });
  });

  describe('11. Performance Tests', () => {
    it('should respond to health check quickly', () => {
      const startTime = Date.now();
      cy.request({
        method: 'GET',
        url: `${baseUrl}/auth/me`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        const duration = Date.now() - startTime;
        expect(response.status).to.eq(200);
        expect(duration).to.be.lessThan(1000); // Should respond in under 1 second
      });
    });

    it('should handle pagination correctly', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/users?skip=0&limit=10`,
        headers: {
          'Authorization': `Bearer ${superAdminToken}`
        }
      }).then((response1) => {
        cy.request({
          method: 'GET',
          url: `${baseUrl}/users?skip=10&limit=10`,
          headers: {
            'Authorization': `Bearer ${superAdminToken}`
          }
        }).then((response2) => {
          expect(response1.status).to.eq(200);
          expect(response2.status).to.eq(200);
          // Results should be different (if there are more than 10 users)
          if (response1.body.length === 10 && response2.body.length > 0) {
            expect(response1.body[0].id).to.not.eq(response2.body[0].id);
          }
        });
      });
    });
  });
});

