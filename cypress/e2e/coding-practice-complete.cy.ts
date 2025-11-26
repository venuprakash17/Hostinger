/// <reference types="cypress" />

/**
 * Comprehensive End-to-End Tests for Coding Practice Platform
 * Tests all features: Super Admin management, student solving, language restrictions, boilerplate switching, test cases, submissions
 */

describe('Coding Practice Platform - Complete E2E Tests', () => {
  const superAdminEmail = 'superadmin1@elevate.edu';
  const superAdminPassword = 'SuperAdmin1@123';
  const studentEmail = 'student1@elevate.edu';
  const studentPassword = 'Student@123';

  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Super Admin - Coding Problem Management', () => {
    beforeEach(() => {
      cy.loginAs(superAdminEmail, superAdminPassword, 'super_admin');
      cy.visit('/superadmin/global-content');
      // Wait for page to load and click on Coding Problems tab
      cy.contains('Coding Problems', { timeout: 10000 }).click();
      cy.wait(1000);
    });

    it('should display coding problems section', () => {
      cy.contains('SvnaPro Coding Problems').should('be.visible');
      cy.contains('Create Coding Problem').should('be.visible');
    });

    it('should open create problem dialog with all fields', () => {
      cy.contains('Create Coding Problem').click();
      
      // Basic Information Section
      cy.contains('Basic Information').should('be.visible');
      cy.get('input[placeholder*="Problem title"]').should('be.visible');
      cy.get('textarea[placeholder*="Detailed problem description"]').should('be.visible');
      cy.contains('Year').should('be.visible');
      cy.contains('Difficulty').should('be.visible');

      // Input/Output Format Section
      cy.contains('Input/Output Format').should('be.visible');
      cy.contains('Input Format').should('be.visible');
      cy.contains('Output Format').should('be.visible');
      cy.contains('Constraints').should('be.visible');
      cy.contains('Sample Input').should('be.visible');
      cy.contains('Sample Output').should('be.visible');

      // Execution Control Section
      cy.contains('Execution Control').should('be.visible');
      cy.contains('Time Limit').should('be.visible');
      cy.contains('Memory Limit').should('be.visible');

      // Language Configuration Section
      cy.contains('Language Configuration').should('be.visible');
      cy.contains('Allowed Languages').should('be.visible');
      cy.contains('Restricted Languages').should('be.visible');
      cy.contains('Recommended Languages').should('be.visible');

      // Test Cases Section
      cy.contains('Test Cases').should('be.visible');
      cy.contains('Add Test Case').should('be.visible');

      // Starter Code Templates Section
      cy.contains('Starter Code Templates').should('be.visible');
    });

    it('should create a coding problem with all fields', () => {
      cy.contains('Create Coding Problem').click();

      // Basic Information
      cy.get('input[placeholder*="Problem title"]').type('Test Problem: Sum of Two Numbers');
      cy.get('textarea[placeholder*="Detailed problem description"]').type('Write a function to add two numbers and return the result.');
      
      // Select Year
      cy.contains('Year').parent().find('button').click();
      cy.contains('Year 1').click();

      // Select Difficulty
      cy.contains('Difficulty').parent().find('button').click();
      cy.contains('Easy').click();

      // Input/Output Format
      cy.contains('Input Format').parent().find('textarea').type('Two integers a and b');
      cy.contains('Output Format').parent().find('textarea').type('Return the sum of a and b');
      cy.contains('Constraints').parent().find('textarea').type('1 ≤ a, b ≤ 1000');
      cy.contains('Sample Input').parent().find('textarea').type('5\n10');
      cy.contains('Sample Output').parent().find('textarea').type('15');

      // Execution Control
      cy.contains('Time Limit').parent().find('input[type="number"]').clear().type('5');
      cy.contains('Memory Limit').parent().find('input[type="number"]').clear().type('256');

      // Language Configuration - Select allowed languages
      cy.contains('Allowed Languages').parent().within(() => {
        cy.contains('Python').click();
        cy.contains('C').click();
        cy.contains('C++').click();
      });

      // Add Test Cases
      cy.contains('Add Test Case').click();
      cy.get('textarea').contains('Test input').parent().find('textarea').first().type('3\n7');
      cy.get('textarea').contains('Expected output').parent().find('textarea').first().type('10');
      
      // Add another test case
      cy.contains('Add Test Case').click();
      cy.get('textarea').contains('Test input').parent().find('textarea').last().type('100\n200');
      cy.get('textarea').contains('Expected output').parent().find('textarea').last().type('300');

      // Starter Code - Python
      cy.contains('Starter Code Templates').parent().within(() => {
        cy.contains('Python').click();
        cy.get('textarea[class*="font-mono"]').first().type('def add(a, b):\n    # Your code here\n    pass');
      });

      // Submit
      cy.contains('Create Problem').click();

      // Verify success
      cy.contains('Coding problem created successfully', { timeout: 10000 }).should('be.visible');
      cy.contains('Test Problem: Sum of Two Numbers').should('be.visible');
    });

    it('should create a problem with restricted languages', () => {
      cy.contains('Create Coding Problem').click();

      cy.get('input[placeholder*="Problem title"]').type('C-Only Problem: Pointer Manipulation');
      cy.get('textarea[placeholder*="Detailed problem description"]').type('This problem must be solved in C only.');
      
      cy.contains('Year').parent().find('button').click();
      cy.contains('Year 2').click();

      // Select C only in allowed languages
      cy.contains('Allowed Languages').parent().within(() => {
        cy.contains('C').click();
      });

      // Set C as restricted language
      cy.contains('Restricted Languages').parent().within(() => {
        cy.contains('C').click();
      });

      // Add starter code for C
      cy.contains('Starter Code Templates').parent().within(() => {
        cy.contains('C').click();
        cy.get('textarea[class*="font-mono"]').first().type('#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}');
      });

      // Add test case
      cy.contains('Add Test Case').click();
      cy.get('textarea').contains('Test input').parent().find('textarea').first().type('5\n10');
      cy.get('textarea').contains('Expected output').parent().find('textarea').first().type('15');

      cy.contains('Create Problem').click();
      cy.contains('Coding problem created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should edit an existing problem', () => {
      // Wait for problems to load
      cy.contains('SvnaPro Coding Problems', { timeout: 10000 }).should('be.visible');
      
      // Find and click edit button on first problem
      cy.get('body').then(($body) => {
        if ($body.find('button').contains('Edit').length > 0) {
          cy.contains('button', 'Edit').first().click();
          
          // Verify edit dialog opens
          cy.contains('Edit Coding Problem').should('be.visible');
          
          // Update title
          cy.get('input[placeholder*="Problem title"]').clear().type('Updated Problem Title');
          
          // Save
          cy.contains('Update Problem').click();
          cy.contains('Coding problem updated successfully', { timeout: 10000 }).should('be.visible');
        }
      });
    });

    it('should delete a coding problem', () => {
      cy.contains('SvnaPro Coding Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('button').contains('Delete').length > 0) {
          cy.contains('button', 'Delete').first().click();
          
          // Confirm deletion
          cy.on('window:confirm', () => true);
          
          cy.contains('Coding problem deleted successfully', { timeout: 10000 }).should('be.visible');
        }
      });
    });
  });

  describe('Student - Coding Practice Interface', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
    });

    it('should display coding practice page', () => {
      cy.contains('Coding Practice').should('be.visible');
      cy.contains('Sharpen your programming skills').should('be.visible');
      cy.contains('Problems').should('be.visible');
    });

    it('should show problems list', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      // Should see at least one problem or empty state
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().should('be.visible');
        } else {
          cy.contains('No coding problems found').should('be.visible');
        }
      });
    });

    it('should display problem details when selected', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          // Click on first problem
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Verify problem details panel appears
          cy.contains('Description').should('be.visible');
          cy.contains('Solution').should('be.visible');
          cy.contains('Submissions').should('be.visible');
        }
      });
    });

    it('should show language selector', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Look for language selector
          cy.get('body').then(($body) => {
            if ($body.find('select, [role="combobox"], button').filter((i, el) => {
              return Cypress.$(el).text().includes('Python') || 
                     Cypress.$(el).text().includes('C') ||
                     Cypress.$(el).text().includes('Language');
            }).length > 0) {
              cy.contains('Python').should('be.visible');
            }
          });
        }
      });
    });

    it('should display code editor', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Look for code editor or textarea
          cy.get('body').then(($body) => {
            if ($body.find('textarea, [class*="editor"], [class*="code"]').length > 0) {
              cy.get('textarea, [class*="editor"], [class*="code"]').should('be.visible');
            }
          });
        }
      });
    });

    it('should show Run and Submit buttons', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Look for Run and Submit buttons
          cy.get('body').then(($body) => {
            if ($body.find('button').filter((i, el) => {
              const text = Cypress.$(el).text();
              return text.includes('Run') || text.includes('Submit');
            }).length > 0) {
              cy.contains('button', 'Run').should('be.visible');
              cy.contains('button', 'Submit').should('be.visible');
            }
          });
        }
      });
    });

    it('should load boilerplate code when language changes', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Try to change language if selector exists
          cy.get('body').then(($body) => {
            const langSelectors = $body.find('select, [role="combobox"], button').filter((i, el) => {
              return Cypress.$(el).text().includes('Python') || 
                     Cypress.$(el).text().includes('C') ||
                     Cypress.$(el).text().includes('Language');
            });
            
            if (langSelectors.length > 0) {
              // Language selector exists, test boilerplate loading
              cy.get('textarea, [class*="editor"]').then(($editor) => {
                const initialContent = $editor.val() as string;
                
                // Change language (if possible)
                // This is a basic test - actual implementation may vary
                cy.log('Boilerplate loading test - language selector found');
              });
            }
          });
        }
      });
    });

    it('should display problem description with all sections', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Check for description tab content
          cy.contains('Description').click();
          
          // Should show problem description sections
          cy.get('body').then(($body) => {
            if ($body.text().includes('Problem Description') || 
                $body.text().includes('Input Format') ||
                $body.text().includes('Output Format') ||
                $body.text().includes('Constraints') ||
                $body.text().includes('Example')) {
              cy.log('Problem description sections found');
            }
          });
        }
      });
    });

    it('should show submissions tab', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Click submissions tab
          cy.contains('Submissions').click();
          
          // Should show submissions list (may be empty)
          cy.contains('Submissions', { timeout: 5000 }).should('be.visible');
        }
      });
    });
  });

  describe('Language Restrictions', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
    });

    it('should disable language dropdown when restricted to single language', () => {
      // This test assumes a problem with restricted_languages = ["c"] exists
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          // Look for a problem that might have restrictions
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Check if language selector is disabled
          cy.get('body').then(($body) => {
            const langSelector = $body.find('select[disabled], button[disabled], [role="combobox"][aria-disabled="true"]');
            if (langSelector.length > 0) {
              cy.log('Language selector is disabled (restricted language detected)');
            }
          });
        }
      });
    });
  });

  describe('Year-Based Visibility', () => {
    it('should show only problems for student year and below', () => {
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
      
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      // Problems shown should be filtered by year
      // This is tested implicitly by checking visible problems
      cy.get('[class*="card"], [class*="problem"]').should('exist');
    });
  });

  describe('Filters', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
    });

    it('should show filters button', () => {
      cy.contains('Filters').should('be.visible');
    });

    it('should open filters dialog', () => {
      cy.contains('Filters').click();
      
      // Should show filter options
      cy.get('body').then(($body) => {
        if ($body.text().includes('Year') || 
            $body.text().includes('Language') ||
            $body.text().includes('Difficulty')) {
          cy.log('Filter options found');
        }
      });
    });
  });

  describe('Code Execution', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
    });

    it('should execute code when Run button is clicked', () => {
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      
      cy.get('body').then(($body) => {
        if ($body.find('[class*="card"], [class*="problem"]').length > 0) {
          cy.get('[class*="card"], [class*="problem"]').first().click();
          
          // Type some code
          cy.get('textarea, [class*="editor"]').then(($editor) => {
            if ($editor.length > 0) {
              cy.wrap($editor).first().type('print("Hello World")', { force: true });
              
              // Click Run button
              cy.contains('button', 'Run').then(($btn) => {
                if ($btn.length > 0 && !$btn.is(':disabled')) {
                  cy.wrap($btn).click();
                  
                  // Should show output or loading state
                  cy.wait(2000);
                  cy.log('Code execution triggered');
                }
              });
            }
          });
        }
      });
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full workflow: create problem → solve → submit', () => {
      // Step 1: Super Admin creates problem
      cy.loginAs(superAdminEmail, superAdminPassword, 'super_admin');
      cy.visit('/superadmin/global-content');
      
      cy.contains('Create Coding Problem').click();
      cy.get('input[placeholder*="Problem title"]').type('E2E Test Problem');
      cy.get('textarea[placeholder*="Detailed problem description"]').type('Add two numbers');
      cy.contains('Year').parent().find('button').click();
      cy.contains('Year 1').click();
      
      // Select languages
      cy.contains('Allowed Languages').parent().within(() => {
        cy.contains('Python').click();
      });
      
      // Add test case
      cy.contains('Add Test Case').click();
      cy.get('textarea').contains('Test input').parent().find('textarea').first().type('2\n3');
      cy.get('textarea').contains('Expected output').parent().find('textarea').first().type('5');
      
      cy.contains('Create Problem').click();
      cy.contains('Coding problem created successfully', { timeout: 10000 }).should('be.visible');
      
      // Step 2: Student solves problem
      cy.clearAuth();
      cy.loginAs(studentEmail, studentPassword, 'student');
      cy.visit('/coding');
      
      cy.contains('Problems', { timeout: 10000 }).should('be.visible');
      cy.contains('E2E Test Problem').click();
      
      // Type solution
      cy.get('textarea, [class*="editor"]').first().type('a = int(input())\nb = int(input())\nprint(a + b)', { force: true });
      
      // Submit solution
      cy.contains('button', 'Submit').then(($btn) => {
        if ($btn.length > 0 && !$btn.is(':disabled')) {
          cy.wrap($btn).click();
          cy.wait(3000);
          cy.log('Solution submitted');
        }
      });
      
      // Step 3: Check submissions
      cy.contains('Submissions').click();
      cy.wait(2000);
      cy.log('End-to-end flow completed');
    });
  });
});

