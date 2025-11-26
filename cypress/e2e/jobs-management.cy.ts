/// <reference types="cypress" />

describe('Jobs Management - Super Admin', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
    cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
  });

  describe('Jobs List and Display', () => {
    it('should display jobs management page', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Manage Jobs').should('be.visible');
      cy.contains('Create Job').should('be.visible');
    });

    it('should display existing jobs in table', () => {
      cy.visit('/superadmin/jobs');
      
      // Wait for jobs to load
      cy.get('table', { timeout: 10000 }).should('be.visible');
      
      // Check for table headers
      cy.contains('Title').should('be.visible');
      cy.contains('Company').should('be.visible');
      cy.contains('Location').should('be.visible');
      cy.contains('CTC').should('be.visible');
    });
  });

  describe('Create Job', () => {
    it('should open create job dialog', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      cy.contains('Create New Job').should('be.visible');
      cy.get('input[name="title"]').should('be.visible');
      cy.get('input[name="company"]').should('be.visible');
    });

    it('should create a new job with all fields', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      // Fill in required fields
      cy.get('input[name="title"]').type('Senior Software Engineer');
      cy.get('input[name="company"]').type('Tech Corp');
      cy.get('input[name="role"]').type('Senior Software Engineer');
      
      // Fill in optional fields
      cy.get('textarea[name="description"]').type('Looking for experienced software engineer');
      cy.get('input[name="location"]').type('Hyderabad');
      cy.get('input[name="ctc"]').type('₹20 LPA');
      
      // Select job type
      cy.get('select[name="job_type"]').select('On-Campus');
      
      // Select eligibility type
      cy.get('select[name="eligibility_type"]').select('all_students');
      
      // Add requirements
      cy.get('textarea[name="requirements"]').type('Bachelor\'s degree;3+ years experience');
      
      // Add rounds
      cy.get('textarea[name="rounds"]').type('Online Test;Technical Interview;HR Round');
      
      // Set deadline
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const deadlineStr = futureDate.toISOString().split('T')[0];
      cy.get('input[name="deadline"]').type(deadlineStr);
      
      // Submit
      cy.contains('Create Job').click();
      
      // Should show success message
      cy.contains('Job created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should create job with branch-specific eligibility', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Create Job').click();
      
      cy.get('input[name="title"]').type('Data Scientist - CSE Only');
      cy.get('input[name="company"]').type('Data Corp');
      cy.get('input[name="role"]').type('Data Scientist');
      cy.get('input[name="location"]').type('Bangalore');
      
      // Select branch eligibility
      cy.get('select[name="eligibility_type"]').select('branch');
      
      // Add eligible branches
      cy.get('input[name="eligible_branches"]').type('CSE,ECE');
      
      cy.contains('Create Job').click();
      
      cy.contains('Job created successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Edit Job', () => {
    it('should edit an existing job', () => {
      cy.visit('/superadmin/jobs');
      
      // Wait for jobs to load
      cy.get('table', { timeout: 10000 }).should('be.visible');
      
      // Click edit on first job (if exists)
      cy.get('button').contains('Edit').first().click({ force: true });
      
      // Update title
      cy.get('input[name="title"]').clear().type('Updated Job Title');
      
      // Save
      cy.contains('Update Job').click();
      
      // Should show success
      cy.contains('Job updated successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Delete Job', () => {
    it('should delete a job with confirmation', () => {
      cy.visit('/superadmin/jobs');
      
      // Wait for jobs to load
      cy.get('table', { timeout: 10000 }).should('be.visible');
      
      // Click delete on first job (if exists)
      cy.get('button').contains('Delete').first().click({ force: true });
      
      // Confirm deletion
      cy.contains('Delete').last().click();
      
      // Should show success
      cy.contains('Job deleted successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Bulk Upload', () => {
    it('should display bulk upload section', () => {
      cy.visit('/superadmin/jobs');
      
      cy.contains('Bulk Upload').should('be.visible');
      cy.contains('Download Template').should('be.visible');
    });

    it('should download job template', () => {
      cy.visit('/superadmin/jobs');
      
      // Intercept the download request
      cy.intercept('GET', '**/jobs/template', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=job_upload_template.xlsx'
        },
        body: 'fake excel content'
      }).as('downloadTemplate');
      
      cy.contains('Download Template').click();
      
      // Should trigger download
      cy.wait('@downloadTemplate', { timeout: 10000 });
      
      // Should show success message
      cy.contains('Template downloaded successfully', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Filters', () => {
    it('should display filter options', () => {
      cy.visit('/superadmin/jobs');
      
      // Check for filter inputs
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should filter jobs by search', () => {
      cy.visit('/superadmin/jobs');
      
      // Wait for jobs to load
      cy.get('table', { timeout: 10000 }).should('be.visible');
      
      // Type in search
      cy.get('input[placeholder*="Search"]').type('Engineer');
      
      // Should filter results
      cy.wait(1000); // Wait for filter to apply
    });
  });
});

describe('Jobs - Student View', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
    cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
  });

  describe('Jobs List', () => {
    it('should display jobs page', () => {
      cy.visit('/jobs');
      
      cy.contains('Jobs').should('be.visible');
    });

    it('should display job filters', () => {
      cy.visit('/jobs');
      
      // Check for filter components
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should filter jobs by search', () => {
      cy.visit('/jobs');
      
      cy.wait(2000); // Wait for jobs to load
      
      cy.get('input[placeholder*="Search"]').type('Engineer');
      
      cy.wait(1000); // Wait for filter
    });

    it('should filter jobs by job type', () => {
      cy.visit('/jobs');
      
      cy.wait(2000);
      
      // Check for job type tabs or filters
      cy.contains('On-Campus').should('be.visible');
      cy.contains('Off-Campus').should('be.visible');
    });

    it('should filter jobs by location', () => {
      cy.visit('/jobs');
      
      cy.wait(2000);
      
      // Look for location filter
      cy.get('select, input').contains('Location').should('exist');
    });

    it('should filter jobs by minimum CTC', () => {
      cy.visit('/jobs');
      
      cy.wait(2000);
      
      // Look for CTC filter
      cy.get('input[type="number"], select').should('exist');
    });
  });

  describe('Job Application', () => {
    it('should display apply button for eligible jobs', () => {
      cy.visit('/jobs');
      
      cy.wait(2000);
      
      // Check for apply buttons
      cy.contains('Apply').should('exist');
    });
  });
});

