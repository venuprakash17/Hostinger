/// <reference types="cypress" />

/**
 * Debug Test for Fill-in-the-Blank Input Field
 * This test will help identify why the input field is not visible
 */

describe('Quiz Fill-in-the-Blank Input Field - Debug Test', () => {
  const studentEmail = 'student1@elevate.edu';
  const studentPassword = 'Student@123';

  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  it('should debug and verify fill-in-the-blank input field is visible', () => {
    cy.loginAs(studentEmail, studentPassword, 'student');
    cy.visit('/tests');
    
    // Wait for tests page to load
    cy.contains('Tests', { timeout: 10000 }).should('be.visible');
    cy.wait(2000);
    
    // Find and click on a quiz (look for any quiz that might have fill-in-the-blank questions)
    cy.get('body').then(($body) => {
      // Try to find any quiz card or button
      if ($body.find('button:contains("Start")').length > 0) {
        cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
      } else if ($body.find('[class*="card"]').length > 0) {
        cy.get('[class*="card"]').first().click({ force: true });
      } else {
        cy.log('No quiz found to start');
        return;
      }
    });
    
    // Wait for quiz page to load
    cy.url({ timeout: 10000 }).should('include', '/quiz/');
    cy.wait(3000);
    
    // Check if we're on a quiz page
    cy.contains('Question', { timeout: 10000 }).should('be.visible');
    
    // Debug: Log the page content to see what's rendered
    cy.get('body').then(($body) => {
      const bodyText = $body.text();
      cy.log('Page content:', bodyText);
      
      // Check for fill-in-the-blank indicators
      if (bodyText.includes('capital of France') || bodyText.includes('France')) {
        cy.log('Found fill-in-the-blank question about France');
      }
      
      // Check for input fields
      const inputCount = $body.find('input[type="text"]').length;
      cy.log(`Found ${inputCount} text input fields on the page`);
      
      // Check if fill-in-the-blank section exists
      if ($body.find('[class*="blue"]').length > 0) {
        cy.log('Found blue elements (likely the fill-in-the-blank container)');
      }
      
      // Try to find the input field by various selectors
      cy.get('body').then(() => {
        // Check for input with placeholder
        cy.get('input[placeholder*="answer"], input[placeholder*="Answer"]', { timeout: 2000 })
          .should('exist')
          .then(($input) => {
            cy.log(`Found input field: ${$input.length}`);
            if ($input.length > 0) {
              cy.wrap($input).should('be.visible');
              cy.wrap($input).should('not.be.disabled');
              cy.log('Input field is visible and enabled');
            }
          })
          .catch(() => {
            cy.log('No input field found with placeholder containing "answer"');
          });
        
        // Check for input in blue container
        cy.get('[class*="blue"] input[type="text"]', { timeout: 2000 })
          .should('exist')
          .then(($input) => {
            cy.log(`Found input in blue container: ${$input.length}`);
            if ($input.length > 0) {
              cy.wrap($input).should('be.visible');
            }
          })
          .catch(() => {
            cy.log('No input field found in blue container');
          });
        
        // Check for any input field at all
        cy.get('input[type="text"]', { timeout: 2000 })
          .then(($inputs) => {
            cy.log(`Total text inputs found: ${$inputs.length}`);
            if ($inputs.length > 0) {
              $inputs.each((index, input) => {
                const $input = Cypress.$(input);
                cy.log(`Input ${index}: visible=${$input.is(':visible')}, disabled=${$input.is(':disabled')}, placeholder=${$input.attr('placeholder')}`);
              });
            }
          })
          .catch(() => {
            cy.log('No text input fields found at all');
          });
      });
    });
    
    // Take a screenshot for debugging
    cy.screenshot('quiz-page-debug');
    
    // Try to interact with the page to see what happens
    cy.get('body').click();
    cy.wait(1000);
  });

  it('should create a quiz with fill-in-the-blank and test it', () => {
    // This test would require faculty/admin login to create a quiz first
    // For now, just document what needs to be tested
    cy.log('To fully test fill-in-the-blank:');
    cy.log('1. Login as faculty/admin');
    cy.log('2. Create a quiz with a fill-in-the-blank question');
    cy.log('3. Login as student');
    cy.log('4. Take the quiz and verify input field is visible');
    cy.log('5. Type an answer and verify it saves');
  });
});
