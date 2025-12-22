/// <reference types="cypress" />

describe('Coding Problems - Complete E2E Tests', () => {
  // Use localhost for local testing, production URL for production testing
  const baseUrl = Cypress.env('BASE_URL') || 'http://localhost:8080';
  const backendUrl = Cypress.env('BACKEND_URL') || 'http://localhost:8000';
  let superAdminToken: string;
  let studentToken: string;

  before(() => {
    // Login as Super Admin
    cy.request({
      method: 'POST',
      url: `${backendUrl}/api/v1/auth/login`,
      body: {
        email: 'admin@elevate.edu',
        password: 'SvnaJobs@123',
        role: 'staff'
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        superAdminToken = response.body.access_token;
      } else {
        cy.log('Super admin login failed, user may need to be created');
        throw new Error('Super admin login failed');
      }
    });

    // Login as Student (create if needed)
    cy.request({
      method: 'POST',
      url: `${backendUrl}/api/v1/auth/login`,
      body: {
        email: 'student@test.com',
        password: 'Student123',
        role: 'student'
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        studentToken = response.body.access_token;
      } else {
        // Try to create student user
        cy.request({
          method: 'POST',
          url: `${backendUrl}/api/v1/auth/signup`,
          body: {
            email: 'student@test.com',
            password: 'Student123',
            full_name: 'Test Student',
            role: 'student'
          },
          failOnStatusCode: false
        }).then(() => {
          // Login after creation
          cy.request({
            method: 'POST',
            url: `${backendUrl}/api/v1/auth/login`,
            body: {
              email: 'student@test.com',
              password: 'Student123',
              role: 'student'
            },
            failOnStatusCode: false
          }).then((loginResponse) => {
            if (loginResponse.status === 200) {
              studentToken = loginResponse.body.access_token;
            }
          });
        });
      }
    });
  });

  beforeEach(() => {
    // Visit the coding problems page
    cy.visit(`${baseUrl}/coding-problems`);
    
    // Wait for page to load
    cy.contains('Browse Problems', { timeout: 10000 }).should('be.visible');
  });

  describe('Problem Listing and Filtering', () => {
    it('should display coding problems list', () => {
      cy.contains('Browse Problems').should('be.visible');
      cy.get('[data-testid="problem-card"], .problem-card, [class*="card"]').should('have.length.greaterThan', 0);
    });

    it('should filter by year without errors', () => {
      // Click filters button
      cy.contains('Filters').click();
      
      // Select Year 1
      cy.get('select[name="year"], [data-testid="year-filter"]').select('1');
      cy.contains('Apply').click();
      
      // Wait for results
      cy.wait(2000);
      
      // Should not show 500 error
      cy.get('body').should('not.contain', 'Internal server error');
      cy.get('body').should('not.contain', '500');
    });

    it('should filter by year 2 without errors', () => {
      cy.contains('Filters').click();
      cy.get('select[name="year"], [data-testid="year-filter"]').select('2');
      cy.contains('Apply').click();
      
      cy.wait(2000);
      cy.get('body').should('not.contain', 'Internal server error');
    });

    it('should filter by difficulty', () => {
      cy.contains('Filters').click();
      cy.get('select[name="difficulty"], [data-testid="difficulty-filter"]').select('Easy');
      cy.contains('Apply').click();
      
      cy.wait(2000);
      cy.get('body').should('not.contain', 'Internal server error');
    });

    it('should search problems', () => {
      cy.get('input[placeholder*="Search"]').type('Count');
      cy.wait(1000);
      
      // Should show filtered results
      cy.get('body').should('not.contain', 'Internal server error');
    });
  });

  describe('Problem Viewing and Code Execution', () => {
    it('should open a problem and display details', () => {
      // Click on first problem
      cy.get('[data-testid="problem-card"], .problem-card, [class*="card"]').first().click();
      
      // Should show problem details
      cy.contains('Description', { timeout: 10000 }).should('be.visible');
      cy.contains('Testcase', { timeout: 5000 }).should('be.visible');
    });

    it('should execute code successfully', () => {
      // Navigate to a problem
      cy.visit(`${baseUrl}/coding?problem=122`);
      
      // Wait for editor to load
      cy.wait(3000);
      
      // Write code
      cy.get('.monaco-editor, [class*="editor"]').first().click();
      cy.get('body').type('{selectall}');
      cy.get('body').type('def solution(n):\n    return bin(n).count("1")\n\nif __name__ == "__main__":\n    n = int(input())\n    print(solution(n))');
      
      // Click Run button
      cy.contains('Run').click();
      
      // Wait for execution
      cy.wait(5000);
      
      // Should show output or error (not 500 error)
      cy.get('body').should('not.contain', 'Internal server error');
      cy.get('body').should('not.contain', '500');
    });

    it('should submit code successfully', () => {
      cy.visit(`${baseUrl}/coding?problem=122`);
      cy.wait(3000);
      
      // Write code
      cy.get('.monaco-editor, [class*="editor"]').first().click();
      cy.get('body').type('{selectall}');
      cy.get('body').type('def solution(n):\n    return bin(n).count("1")\n\nif __name__ == "__main__":\n    n = int(input())\n    print(solution(n))');
      
      // Click Submit button
      cy.contains('Submit').click();
      
      // Wait for submission
      cy.wait(8000);
      
      // Should show submission result (not 500 error)
      cy.get('body').should('not.contain', 'Internal server error');
      cy.get('body').should('not.contain', '500');
      
      // Should show test results
      cy.contains('Test Result', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('API Endpoint Tests', () => {
    it('should fetch problems by year via API', () => {
      cy.request({
        method: 'GET',
        url: `${backendUrl}/api/v1/coding-problems?is_active=true&year=1`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('should fetch problems by year 2 via API', () => {
      cy.request({
        method: 'GET',
        url: `${backendUrl}/api/v1/coding-problems?is_active=true&year=2`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('should execute code via API', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/coding-problems/122/execute`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          language: 'python',
          code: 'print("Hello World")',
          stdin: ''
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('output');
      });
    });

    it('should submit code via API', () => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/coding-problems/122/submit`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          language: 'python',
          code: 'def solution(n):\n    return bin(n).count("1")\n\nif __name__ == "__main__":\n    n = int(input())\n    print(solution(n))'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status');
        expect(response.body).to.have.property('results');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid year filter gracefully', () => {
      cy.request({
        method: 'GET',
        url: `${backendUrl}/api/v1/coding-problems?year=99`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return 200 with empty array or 400, not 500
        expect([200, 400]).to.include(response.status);
      });
    });

    it('should handle missing problem gracefully', () => {
      cy.request({
        method: 'GET',
        url: `${backendUrl}/api/v1/coding-problems/99999`,
        headers: {
          Authorization: `Bearer ${superAdminToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        expect([404, 400]).to.include(response.status);
      });
    });
  });
});

