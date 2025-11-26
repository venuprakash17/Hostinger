/// <reference types="cypress" />

describe('Job Aggregation', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Admin - Sync Jobs', () => {
    it('should allow admin to sync jobs from external sources', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/job-aggregation');
      
      cy.contains('Job Aggregation', { timeout: 10000 }).should('be.visible');
      
      // Click sync button
      cy.contains('button', 'Sync Jobs').click();
      
      // Select sources
      cy.contains('LinkedIn').click();
      cy.contains('Indeed').click();
      
      // Set keywords
      cy.get('input[type="text"]').first().clear().type('software engineer, developer, python');
      
      // Set location
      cy.get('input[type="text"]').eq(1).type('Hyderabad');
      
      // Set max results
      cy.get('input[type="number"]').clear().type('50');
      
      // Submit sync
      cy.contains('button', 'Sync Jobs').click();
      
      // Verify success
      cy.contains('Jobs synced successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should display aggregated jobs', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/job-aggregation');
      
      cy.contains('Aggregated Jobs', { timeout: 10000 }).should('be.visible');
    });

    it('should allow importing job to main jobs list', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/job-aggregation');
      
      // Wait for jobs to load
      cy.wait(2000);
      
      // Click import button on first job
      cy.get('body').then(($body) => {
        if ($body.find('button').contains('Import').length > 0) {
          cy.contains('button', 'Import').first().click();
          
          // Verify success
          cy.contains('Job imported successfully', { timeout: 10000 }).should('be.visible');
        }
      });
    });

    it('should allow filtering by source', () => {
      cy.loginAs('admin1@elevate.edu', 'Admin@123', 'admin');
      cy.visit('/admin/job-aggregation');
      
      cy.contains('All Sources').click();
      cy.contains('LinkedIn').click();
    });
  });
});

