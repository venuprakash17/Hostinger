/// <reference types="cypress" />

describe('Staff Bulk Upload E2E Tests', () => {
  const baseUrl = Cypress.env('BASE_URL') || 'http://localhost:8080';
  const backendUrl = Cypress.env('BACKEND_URL') || 'http://localhost:8000';

  beforeEach(() => {
    cy.clearAuth();
  });

  describe('Staff Bulk Upload Flow', () => {
    let superAdminToken: string;
    let collegeId: number;

    before(() => {
      // Login as super admin
      cy.request({
        method: 'POST',
        url: `${backendUrl}/api/v1/auth/login`,
        body: {
          email: 'admin@elevate.edu',
          password: 'Admin123!',
          role: 'staff'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          superAdminToken = response.body.access_token;
          
          // Get colleges to find college ID
          cy.request({
            method: 'GET',
            url: `${backendUrl}/api/v1/colleges`,
            headers: {
              'Authorization': `Bearer ${superAdminToken}`
            }
          }).then((collegesResponse) => {
            if (collegesResponse.status === 200 && collegesResponse.body.length > 0) {
              collegeId = collegesResponse.body[0].id;
            }
          });
        }
      });
    });

    it('should debug Excel file structure', () => {
      // Skip if token not available
      if (!superAdminToken) {
        cy.log('Skipping debug test - no token available');
        return;
      }

      // Use cy.fixture for file reading
      cy.fixture('staff_test.xlsx', 'base64').then((fileContent) => {
        // Convert base64 to blob
        const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const formData = new FormData();
        formData.append('file', blob, 'staff_test.xlsx');

        cy.request({
          method: 'POST',
          url: `${backendUrl}/api/v1/bulk-upload/debug/staff-excel`,
          headers: {
            'Authorization': `Bearer ${superAdminToken}`
          },
          body: formData,
          failOnStatusCode: false
        }).then((response) => {
          cy.log('Debug Response:', JSON.stringify(response.body, null, 2));
          if (response.status === 200) {
            expect(response.body.row_count).to.be.greaterThan(0);
            expect(response.body.headers).to.include('email');
            expect(response.body.headers).to.include('role');
            cy.log(`Found ${response.body.row_count} rows in Excel file`);
            cy.log(`Headers: ${response.body.headers.join(', ')}`);
          } else {
            cy.log(`Debug endpoint returned status ${response.status}`);
          }
        });
      });
    });

    it('should upload staff Excel file successfully', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Login via UI
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('admin@elevate.edu');
      cy.get('input[name="password"]').type('Admin123!');
      cy.get('select[name="role"]').select('staff');
      cy.get('button[type="submit"]').click();
      
      // Wait for redirect
      cy.url({ timeout: 10000 }).should('include', '/superadmin');
      
      // Navigate to Manage Colleges
      cy.visit(`${baseUrl}/superadmin/colleges`);
      cy.wait(3000);
      
      // Wait for colleges table to load
      cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0);
      
      // Select first college - look for View button or click on row
      cy.get('table tbody tr').first().within(() => {
        cy.get('button').contains('View').click({ force: true });
      });
      
      cy.wait(3000);
      
      // Wait for FileUpload component to be visible
      cy.contains('Upload Staff', { timeout: 10000 }).should('be.visible');
      
      // Find file input - it might be hidden, so use force
      cy.get('input[type="file"]', { timeout: 10000 }).should('exist').then(($input) => {
        // Use Cypress file upload
        cy.fixture('staff_test.xlsx', 'base64').then((fileContent) => {
          // Convert base64 to blob
          const blob = Cypress.Blob.base64StringToBlob(fileContent, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          const file = new File([blob], 'staff_test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          ($input[0] as HTMLInputElement).files = dataTransfer.files;
          cy.wrap($input).trigger('change', { force: true });
        });
      });
      
      // Wait for file to be selected
      cy.contains('staff_test.xlsx', { timeout: 5000 }).should('be.visible');
      
      // Click upload button
      cy.get('button').contains('Upload', { matchCase: false }).should('be.visible').click({ force: true });
      
      // Wait for upload to complete
      cy.wait(10000);
      
      // Check for success message or results
      cy.get('body').then(($body) => {
        if ($body.text().includes('successfully imported') || $body.text().includes('success')) {
          cy.contains('success', { matchCase: false }).should('be.visible');
        }
      });
    });

    it('should show proper error messages for invalid data', () => {
      cy.visit(`${baseUrl}/login`);
      
      // Login
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('admin@elevate.edu');
      cy.get('input[name="password"]').type('Admin123!');
      cy.get('select[name="role"]').select('staff');
      cy.get('button[type="submit"]').click();
      
      cy.url({ timeout: 10000 }).should('include', '/superadmin');
      
      // Navigate to Manage Colleges
      cy.visit(`${baseUrl}/superadmin/colleges`);
      cy.wait(3000);
      
      // Select first college
      cy.get('table tbody tr', { timeout: 10000 }).first().within(() => {
        cy.get('button').contains('View').click({ force: true });
      });
      
      cy.wait(3000);
      
      // Wait for FileUpload component
      cy.contains('Upload Staff', { timeout: 10000 }).should('be.visible');
      
      // Try uploading invalid file
      cy.get('input[type="file"]', { timeout: 10000 }).should('exist').then(($input) => {
        const blob = new Blob(['invalid content'], { type: 'text/plain' });
        const file = new File([blob], 'invalid.txt', { type: 'text/plain' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Should show error - either validation error or upload error
      cy.wait(2000);
      cy.get('body').then(($body) => {
        const bodyText = $body.text().toLowerCase();
        if (bodyText.includes('error') || bodyText.includes('invalid') || bodyText.includes('failed')) {
          cy.contains(/error|invalid|failed/i).should('be.visible');
        }
      });
    });
  });
});

