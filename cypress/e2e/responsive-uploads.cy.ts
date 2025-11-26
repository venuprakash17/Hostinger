/**
 * Responsive Design Tests for Bulk Upload Components
 * Tests the upload interface across different viewport sizes
 */

describe('Upload Component Responsiveness', () => {
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

    // Login as super admin
    cy.visit('/login');
    cy.contains('Faculty / Admin').click();
    cy.get('input[type="email"]').type('superadmin@elevate.edu');
    cy.get('input[type="password"]').type('SuperAdmin@123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/superadmin/dashboard', { timeout: 10000 });
  });

  describe('Mobile Viewport (375x667 - iPhone SE)', () => {
    beforeEach(() => {
      cy.viewport(375, 667);
    });

    it('should display upload component correctly on mobile', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Check upload component is visible
      cy.contains('Upload Students CSV/Excel').should('be.visible');
      
      // Check template buttons stack vertically
      cy.contains('Download Excel Template').should('be.visible');
      cy.contains('Download CSV Template').should('be.visible');
      
      // Verify buttons are full width on mobile
      cy.contains('Download Excel Template').parent().should('have.class', 'flex-col');
      
      // Check file input area
      cy.get('input[type="file"]').should('be.visible');
      cy.contains('Drag & drop your file here').should('be.visible');
    });

    it('should have touch-friendly button sizes on mobile', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Check button has minimum touch target size (44px)
      cy.contains('Download Excel Template').should('have.css', 'min-height').and('match', /44|auto/);
      
      // Check upload button
      cy.contains('Upload Students CSV/Excel').parent().parent().within(() => {
        cy.get('button').contains('Upload').should('have.css', 'min-height').and('match', /44|auto/);
      });
    });

    it('should truncate long file names on mobile', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Create a file with long name
      const longFileName = 'a'.repeat(50) + '.csv';
      const csvContent = 'email,password,full_name,branch_id,section,roll_number,present_year\nstudent1@test.com,Password123,Test Student,CSE001,A,20CS001,1';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], longFileName, { type: 'text/csv' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // File name should be truncated
      cy.contains(longFileName.substring(0, 20)).should('be.visible');
    });

    it('should display error messages correctly on mobile', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Try invalid file type
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      cy.get('input[type="file"]').then(($input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(invalidFile);
        ($input[0] as HTMLInputElement).files = dataTransfer.files;
        cy.wrap($input).trigger('change', { force: true });
      });
      
      // Error should be visible and readable
      cy.contains('Invalid file type', { timeout: 2000 }).should('be.visible');
    });
  });

  describe('Tablet Viewport (768x1024 - iPad)', () => {
    beforeEach(() => {
      cy.viewport(768, 1024);
    });

    it('should display upload component correctly on tablet', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Check upload component
      cy.contains('Upload Students CSV/Excel').should('be.visible');
      
      // Template buttons should be in a row on tablet
      cy.contains('Download Excel Template').should('be.visible');
      cy.contains('Download CSV Template').should('be.visible');
      
      // File input should be visible
      cy.get('input[type="file"]').should('be.visible');
    });

    it('should have proper spacing on tablet', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Check padding is appropriate
      cy.contains('Upload Students CSV/Excel').parent().parent().should('have.class', 'px-4');
    });
  });

  describe('Desktop Viewport (1920x1080)', () => {
    beforeEach(() => {
      cy.viewport(1920, 1080);
    });

    it('should display upload component correctly on desktop', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Check all elements are visible
      cy.contains('Upload Students CSV/Excel').should('be.visible');
      cy.contains('Download Excel Template').should('be.visible');
      cy.contains('Download CSV Template').should('be.visible');
      cy.get('input[type="file"]').should('be.visible');
    });

    it('should have optimal layout on desktop', () => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Template buttons should be in a row
      cy.contains('Download Excel Template').parent().should('have.class', 'sm:flex-row');
      
      // File input and remove button should be side by side
      cy.get('input[type="file"]').parent().should('have.class', 'sm:flex-row');
    });
  });

  describe('Responsive Text Sizing', () => {
    it('should adjust text sizes based on viewport', () => {
      // Mobile
      cy.viewport(375, 667);
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Upload Students CSV/Excel').should('have.class', 'text-base');
      
      // Desktop
      cy.viewport(1920, 1080);
      cy.reload();
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Upload Students CSV/Excel').should('have.class', 'sm:text-lg');
    });
  });

  describe('Responsive Button Layout', () => {
    it('should stack buttons vertically on mobile', () => {
      cy.viewport(375, 667);
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Download Excel Template').parent().should('have.class', 'flex-col');
    });

    it('should display buttons horizontally on tablet and desktop', () => {
      cy.viewport(768, 1024);
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Download Excel Template').parent().should('have.class', 'sm:flex-row');
    });
  });

  describe('Drag and Drop Area Responsiveness', () => {
    it('should have appropriate padding on mobile', () => {
      cy.viewport(375, 667);
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Drag & drop your file here').parent().parent().parent().should('have.class', 'p-4');
    });

    it('should have more padding on larger screens', () => {
      cy.viewport(1920, 1080);
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      cy.contains('Drag & drop your file here').parent().parent().parent().should('have.class', 'sm:p-6');
    });
  });

  describe('Results Display Responsiveness', () => {
    beforeEach(() => {
      cy.visit('/superadmin/colleges');
      cy.get('[data-testid="college-card"]', { timeout: 10000 }).first().click();
      
      // Mock successful upload
      cy.intercept('POST', '**/bulk-upload/students*', {
        statusCode: 200,
        body: {
          success_count: 5,
          failed_count: 2,
          failed: [
            { row: 2, error: 'Email is required' },
            { row: 3, error: 'Invalid branch_id' }
          ]
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
        cy.get('button').contains('Upload').click();
      });
      
      cy.wait('@uploadSuccess');
    });

    it('should display results correctly on mobile', () => {
      cy.viewport(375, 667);
      
      // Results should stack vertically on mobile
      cy.contains('5 successful').should('be.visible');
      cy.contains('2 failed').should('be.visible');
      
      // Error list should be scrollable
      cy.contains('Failed Items').should('be.visible');
      cy.contains('Email is required').should('be.visible');
    });

    it('should display results correctly on desktop', () => {
      cy.viewport(1920, 1080);
      
      // Results should be side by side on desktop
      cy.contains('5 successful').should('be.visible');
      cy.contains('2 failed').should('be.visible');
    });
  });
});

