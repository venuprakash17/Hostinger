/// <reference types="cypress" />

describe('Resume Module E2E Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });

  describe('Resume Page Access', () => {
    it('should navigate to resume page after login', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      cy.url().should('include', '/resume');
    });

    it('should show resume tabs', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      cy.contains('Build', { timeout: 10000 }).should('be.visible');
      cy.contains('ATS Score').should('be.visible');
      cy.contains('Role-Based').should('be.visible');
      cy.contains('Cover Letter').should('be.visible');
    });
  });

  describe('Profile Completeness Calculation', () => {
    it('should show 0% when no data is filled', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      cy.contains('Profile Completeness', { timeout: 10000 }).should('be.visible');
      cy.contains('0%').should('be.visible');
    });

    it('should show 50% after filling personal info only', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Fill Personal Information
      cy.get('input[id="full_name"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[id="full_name"]').type('John Doe');
      cy.get('input[id="email"]').type('john.doe@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      
      // Save Personal Information
      cy.contains('button', 'Save Personal Information').click();
      
      // Wait for save to complete
      cy.wait(1000);
      
      // Check completeness - should be 50% (1 of 2 required sections)
      cy.contains('50%', { timeout: 5000 }).should('be.visible');
    });

    it('should show 100% after filling personal info and education', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Fill Personal Information
      cy.get('input[id="full_name"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[id="full_name"]').clear().type('John Doe');
      cy.get('input[id="email"]').clear().type('john.doe@example.com');
      cy.get('input[id="phone_number"]').clear().type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      // Add Education
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).should('be.visible');
      cy.get('input[id="institution_name"]').type('MIT');
      cy.get('input[id="degree"]').type('Bachelor of Science');
      cy.get('input[id="field_of_study"]').type('Computer Science');
      cy.contains('button', 'Add Education').click();
      
      // Wait for education to be saved
      cy.wait(2000);
      
      // Check completeness - should be 100%
      cy.contains('100%', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Personal Information Form', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
    });

    it('should have all personal info fields', () => {
      cy.contains('Personal Information', { timeout: 10000 }).should('be.visible');
      cy.get('input[id="full_name"]').should('be.visible');
      cy.get('input[id="email"]').should('be.visible');
      cy.get('input[id="phone_number"]').should('be.visible');
      cy.get('input[id="linkedin_profile"]').should('be.visible');
      cy.get('input[id="github_portfolio"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"]').click();
      // Should show validation errors or prevent submission
      cy.get('input[id="full_name"]:invalid, p.text-destructive').should('exist');
    });

    it('should save personal information successfully', () => {
      cy.get('input[id="full_name"]').type('Jane Smith');
      cy.get('input[id="email"]').type('jane.smith@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-987-6543');
      cy.contains('button', 'Save Personal Information').click();
      
      // Should show success message
      cy.contains(/saved|success/i, { timeout: 5000 }).should('be.visible');
    });

    it('should persist personal information on page reload', () => {
      cy.get('input[id="full_name"]').type('Test User');
      cy.get('input[id="email"]').type('test@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-111-2222');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      // Reload page
      cy.reload();
      
      // Data should persist
      cy.get('input[id="full_name"]', { timeout: 10000 }).should('have.value', 'Test User');
      cy.get('input[id="email"]').should('have.value', 'test@example.com');
    });
  });

  describe('Education Form', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
    });

    it('should show Add Education button', () => {
      cy.contains('button', 'Add Education', { timeout: 10000 }).should('be.visible');
    });

    it('should open education form when Add Education is clicked', () => {
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).should('be.visible');
      cy.get('input[id="degree"]').should('be.visible');
    });

    it('should save education entry', () => {
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('Harvard University');
      cy.get('input[id="degree"]').type('Master of Science');
      cy.get('input[id="field_of_study"]').type('Data Science');
      cy.contains('button', 'Add Education').click();
      
      // Should show success message
      cy.contains(/added|success/i, { timeout: 5000 }).should('be.visible');
      
      // Education entry should appear
      cy.contains('Harvard University').should('be.visible');
      cy.contains('Master of Science').should('be.visible');
    });

    it('should persist education entries on page reload', () => {
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('Stanford University');
      cy.get('input[id="degree"]').type('Bachelor of Arts');
      cy.contains('button', 'Add Education').click();
      cy.wait(1000);
      
      // Reload page
      cy.reload();
      
      // Education should persist
      cy.contains('Stanford University', { timeout: 5000 }).should('be.visible');
    });

    it('should allow editing education entry', () => {
      // Add education first
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('Test University');
      cy.get('input[id="degree"]').type('Test Degree');
      cy.contains('button', 'Add Education').click();
      cy.wait(1000);
      
      // Find and click edit button
      cy.contains('Test University').parent().find('button').contains('Edit', { matchCase: false }).click();
      
      // Update the institution name
      cy.get('input[id="institution_name"]').clear().type('Updated University');
      cy.contains('button', 'Update Education').click();
      
      // Should show updated entry
      cy.contains('Updated University', { timeout: 5000 }).should('be.visible');
    });

    it('should allow deleting education entry', () => {
      // Add education first
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('To Delete University');
      cy.get('input[id="degree"]').type('To Delete Degree');
      cy.contains('button', 'Add Education').click();
      cy.wait(1000);
      
      // Find and click delete button
      cy.contains('To Delete University').parent().find('button').contains('Trash', { matchCase: false }).click();
      cy.wait(500);
      
      // Entry should be removed
      cy.contains('To Delete University').should('not.exist');
    });
  });

  describe('Generate Resume Button', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
    });

    it('should not show Generate Resume button at 0%', () => {
      cy.contains('Generate Resume PDF', { timeout: 10000 }).should('not.exist');
    });

    it('should not show Generate Resume button at 50%', () => {
      // Fill only Personal Info
      cy.get('input[id="full_name"]', { timeout: 10000 }).type('John Doe');
      cy.get('input[id="email"]').type('john@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(2000);
      
      // Should still not show button at 50%
      cy.contains('Generate Resume PDF').should('not.exist');
    });

    it('should show Generate Resume button at 100%', () => {
      // Fill Personal Info
      cy.get('input[id="full_name"]', { timeout: 10000 }).type('John Doe');
      cy.get('input[id="email"]').type('john@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      // Add Education
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('MIT');
      cy.get('input[id="degree"]').type('BS Computer Science');
      cy.contains('button', 'Add Education').click();
      cy.wait(2000);
      
      // Button should appear
      cy.contains('Generate Resume PDF', { timeout: 5000 }).should('be.visible');
    });

    it('should generate resume when button is clicked', () => {
      // Fill required fields
      cy.get('input[id="full_name"]', { timeout: 10000 }).type('John Doe');
      cy.get('input[id="email"]').type('john@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('MIT');
      cy.get('input[id="degree"]').type('BS Computer Science');
      cy.contains('button', 'Add Education').click();
      cy.wait(2000);
      
      // Click Generate Resume button
      cy.contains('Generate Resume PDF').click();
      
      // Should show generating message
      cy.contains(/generating|enhancing|creating/i, { timeout: 10000 }).should('be.visible');
      
      // After some time, should show success or complete
      // Note: PDF download may not be testable in Cypress, but we can check for success message
      cy.wait(5000); // Wait for AI enhancement and PDF generation
      cy.contains(/success|generated|downloaded/i, { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Optional Sections', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Fill required sections first
      cy.get('input[id="full_name"]', { timeout: 10000 }).type('John Doe');
      cy.get('input[id="email"]').type('john@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('MIT');
      cy.get('input[id="degree"]').type('BS Computer Science');
      cy.contains('button', 'Add Education').click();
      cy.wait(1000);
    });

    it('should allow adding projects', () => {
      cy.contains('button', 'Add Project').click();
      cy.get('input[id="project_title"]', { timeout: 5000 }).should('be.visible');
      cy.get('input[id="project_title"]').type('Test Project');
      cy.contains('button', 'Add Project').click();
      cy.wait(1000);
      cy.contains('Test Project').should('be.visible');
    });

    it('should allow adding skills', () => {
      cy.contains('button', 'Add Skills').click();
      cy.get('[role="combobox"]', { timeout: 5000 }).should('be.visible'); // Category select
      cy.contains('Technical Skills').click();
      cy.wait(500);
      cy.get('input[placeholder*="Python"]', { timeout: 5000 }).should('be.visible');
      cy.get('input[placeholder*="Python"]').type('Python, React, Node.js');
      cy.contains('button', 'Add Skills').click();
      cy.wait(1000);
      cy.contains('Technical Skills').should('be.visible');
    });

    it('should allow adding certifications', () => {
      cy.contains('button', 'Add Certification').click();
      cy.get('input[id="certification_name"]', { timeout: 5000 }).should('be.visible');
      cy.get('input[id="certification_name"]').type('AWS Certified');
      cy.get('input[id="issuing_organization"]').type('Amazon');
      cy.contains('button', 'Add Certification').click();
      cy.wait(1000);
      cy.contains('AWS Certified').should('be.visible');
    });
  });

  describe('Data Persistence', () => {
    it('should persist all data across page reloads', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Fill Personal Info
      cy.get('input[id="full_name"]', { timeout: 10000 }).type('Persist Test');
      cy.get('input[id="email"]').type('persist@test.com');
      cy.get('input[id="phone_number"]').type('+1 555-999-8888');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(1000);
      
      // Add Education
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('Persistence University');
      cy.get('input[id="degree"]').type('BS Test');
      cy.contains('button', 'Add Education').click();
      cy.wait(1000);
      
      // Add Project
      cy.contains('button', 'Add Project').click();
      cy.get('input[id="project_title"]', { timeout: 5000 }).type('Persistence Project');
      cy.contains('button', 'Add Project').click();
      cy.wait(1000);
      
      // Reload page
      cy.reload();
      
      // All data should persist
      cy.contains('Persist Test', { timeout: 10000 }).should('be.visible');
      cy.contains('Persistence University').should('be.visible');
      cy.contains('Persistence Project').should('be.visible');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
    });

    it('should validate email format in personal info', () => {
      cy.get('input[id="email"]').type('invalid-email');
      cy.contains('button', 'Save Personal Information').click();
      // Should show validation error or prevent submission
      cy.get('input[id="email"]:invalid').should('exist').or('p.text-destructive').should('exist');
    });

    it('should require institution name for education', () => {
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="degree"]', { timeout: 5000 }).type('Test Degree');
      cy.contains('button', 'Add Education').click();
      // Should show validation error
      cy.get('input[id="institution_name"]:invalid, p.text-destructive').should('exist');
    });
  });

  describe('Completeness Updates', () => {
    it('should update completeness in real-time', () => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
      cy.visit('/resume');
      
      // Initially 0%
      cy.contains('0%', { timeout: 10000 }).should('be.visible');
      
      // Fill Personal Info - should become 50%
      cy.get('input[id="full_name"]').type('John Doe');
      cy.get('input[id="email"]').type('john@example.com');
      cy.get('input[id="phone_number"]').type('+1 555-123-4567');
      cy.contains('button', 'Save Personal Information').click();
      cy.wait(2000);
      
      cy.contains('50%', { timeout: 5000 }).should('be.visible');
      
      // Add Education - should become 100%
      cy.contains('button', 'Add Education').click();
      cy.get('input[id="institution_name"]', { timeout: 5000 }).type('MIT');
      cy.get('input[id="degree"]').type('BS');
      cy.contains('button', 'Add Education').click();
      cy.wait(2000);
      
      cy.contains('100%', { timeout: 5000 }).should('be.visible');
    });
  });
});

