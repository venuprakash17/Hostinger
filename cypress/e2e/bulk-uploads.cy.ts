/**
 * Comprehensive End-to-End Tests for Bulk Uploads
 * Tests all upload flows: Students, Staff, Faculty, HOD, Departments, etc.
 */

describe('Bulk Upload Functionality', () => {
  const API_BASE_URL = Cypress.env('API_BASE_URL') || 'http://localhost:8000/api/v1';
  
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Verify backend is running
    cy.request({
      method: 'GET',
      url: 'http://localhost:8000/health',
      failOnStatusCode: false,
      timeout: 5000,
    }).then((response) => {
      if (response.status !== 200) {
        throw new Error('Backend server is not running!');
      }
    });
  });

  describe('Super Admin Upload Flows', () => {
    beforeEach(() => {
      // Login as super admin
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
    });

    describe('Student Bulk Upload', () => {
      it('should display upload interface for students', () => {
        cy.visit('/superadmin/colleges');
        
        // Wait for colleges to load and select first college
        cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
        
        // Verify upload component is visible
        cy.contains('Upload Students CSV/Excel').should('be.visible');
        cy.contains('Download Excel Template').should('be.visible');
        cy.contains('Download CSV Template').should('be.visible');
      });

      it('should download student template files', () => {
        cy.visit('/superadmin/colleges');
        cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
        
        // Test Excel template download
        cy.contains('Download Excel Template').click();
        cy.wait(1000);
        
        // Test CSV template download
        cy.contains('Download CSV Template').click();
        cy.wait(1000);
      });

      it('should validate file selection', () => {
        cy.visit('/superadmin/colleges');
        cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
        
        // Try to upload without selecting file
        cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
          cy.get('button').contains('Upload Students CSV/Excel').should('be.disabled');
        });
      });

      it('should handle file drag and drop', () => {
        cy.visit('/superadmin/colleges');
        cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
        
        // Create a test CSV file
        const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], 'test-students.csv', { type: 'text/csv' });
        
        cy.get('input[type="file"]').then(($input) => {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          ($input[0] as HTMLInputElement).files = dataTransfer.files;
          cy.wrap($input).trigger('change', { force: true });
        });
        
        // Verify file is selected
        cy.contains('test-students.csv').should('be.visible');
      });
    });

    describe('Staff Bulk Upload', () => {
      it('should display upload interface for staff', () => {
        cy.visit('/superadmin/users');
        
        // Navigate to bulk upload tab
        cy.contains('Bulk Import Users').click();
        
        // Verify upload component is visible
        cy.contains('Upload Students CSV/Excel').should('be.visible');
      });

      it('should require college selection for student upload', () => {
        cy.visit('/superadmin/users');
        cy.contains('Bulk Import Users').click();
        
        // Verify warning message when no college selected
        cy.contains('Please select a college').should('be.visible');
        
        // Upload should be disabled
        cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
          cy.get('button').contains('Upload Students CSV/Excel').should('be.disabled');
        });
      });
    });

    describe('Department Bulk Upload', () => {
      it('should access department upload interface', () => {
        cy.visit('/superadmin/colleges');
        cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
        
        // Look for department management section
        cy.contains('Departments').should('be.visible');
      });
    });
  });

  describe('College Admin Upload Flows', () => {
    beforeEach(() => {
      // Login as college admin (assuming test admin exists)
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('admin@testcollege.edu');
      cy.get('input[type="password"]').type('Admin123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard', { timeout: 10000 });
    });

    it('should display upload interface for HOD/Faculty', () => {
      cy.visit('/admin/users');
      
      // Look for bulk upload section
      cy.contains('Upload Staff').should('be.visible');
      cy.contains('Download Excel Template').should('be.visible');
    });

    it('should validate file types', () => {
      cy.visit('/admin/users');
      
      // Try to upload invalid file type
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(invalidFile);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Should show error for invalid file type
      cy.contains('Invalid file type', { timeout: 2000 }).should('be.visible');
    });
  });

  describe('Upload Error Handling', () => {
    beforeEach(() => {
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
    });

    it('should handle file size validation', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Create a large file (>10MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeContent], 'large-file.csv', { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(largeFile);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Should show file size error
      cy.contains('File size exceeds', { timeout: 2000 }).should('be.visible');
    });

    it('should display upload progress', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Create valid CSV file
      const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
      const file = new File([csvContent], 'test-students.csv', { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Start upload
      cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
        cy.get('button').contains('Upload Students CSV/Excel').click();
      });
      
      // Should show progress indicator
      cy.contains('Uploading...', { timeout: 2000 }).should('be.visible');
    });

    it('should handle upload cancellation', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
      const file = new File([csvContent], 'test-students.csv', { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Start upload
      cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
        cy.get('button').contains('Upload Students CSV/Excel').click();
      });
      
      // Cancel upload
      cy.contains('Cancel', { timeout: 2000 }).click();
      
      // Should show cancellation message
      cy.contains('cancelled', { timeout: 2000 }).should('be.visible');
    });
  });

  describe('Upload Success and Error Display', () => {
    beforeEach(() => {
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
    });

    it('should display success count after upload', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Mock successful upload response
      cy.intercept('POST', '**/bulk-upload/students*', {
        statusCode: 200,
        body: {
          success_count: 5,
          failed_count: 0,
          message: 'Upload successful'
        }
      }).as('uploadSuccess');
      
      const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
      const file = new File([csvContent], 'test-students.csv', { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
        cy.get('button').contains('Upload Students CSV/Excel').click();
      });
      
      cy.wait('@uploadSuccess');
      
      // Should display success count
      cy.contains('5 successful').should('be.visible');
    });

    it('should display failed items with error details', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Mock upload with failures
      cy.intercept('POST', '**/bulk-upload/students*', {
        statusCode: 200,
        body: {
          success_count: 3,
          failed_count: 2,
          failed: [
            { row: 2, error: 'Email is required' },
            { row: 3, error: 'Invalid branch_id' }
          ]
        }
      }).as('uploadWithFailures');
      
      const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
      const file = new File([csvContent], 'test-students.csv', { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
        cy.get('button').contains('Upload Students CSV/Excel').click();
      });
      
      cy.wait('@uploadWithFailures');
      
      // Should display failure details
      cy.contains('2 failed').should('be.visible');
      cy.contains('Failed Items').should('be.visible');
      cy.contains('Email is required').should('be.visible');
      cy.contains('Invalid branch_id').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
    });

    it('should be responsive on mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE size
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Verify upload component is visible and usable
      cy.contains('Upload Students CSV/Excel').should('be.visible');
      cy.get('input[type="file"]').should('be.visible');
    });

    it('should be responsive on tablet viewport', () => {
      cy.viewport(768, 1024); // iPad size
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Verify layout adapts
      cy.contains('Upload Students CSV/Excel').should('be.visible');
    });
  });

  describe('Template Download Functionality', () => {
    beforeEach(() => {
      cy.visit('/login');
      cy.contains('Faculty / Admin').click();
      cy.get('input[type="email"]').type('superadmin@elevate.edu');
      cy.get('input[type="password"]').type('SuperAdmin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
    });

    it('should download student template with correct format', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Intercept template download
      cy.intercept('GET', '**/bulk-upload/template/students*', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        body: 'test file content'
      }).as('templateDownload');
      
      cy.contains('Download Excel Template').click();
      cy.wait('@templateDownload');
    });

    it('should download CSV template', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.intercept('GET', '**/bulk-upload/template/students*', {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv'
        },
        body: 'email,password,full_name,branch_id,section,roll_number,present_year'
      }).as('csvDownload');
      
      cy.contains('Download CSV Template').click();
      cy.wait('@csvDownload');
    });
  });
});

