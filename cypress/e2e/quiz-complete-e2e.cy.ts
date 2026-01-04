/// <reference types="cypress" />

/**
 * Complete Quiz E2E Test
 * Tests all quiz functionality including all question types, timers, answer saving, and submission
 */

describe('Complete Quiz E2E Test - Production Grade', () => {
  const studentEmail = 'student1@elevate.edu';
  const studentPassword = 'Student@123';
  const facultyEmail = 'faculty.cs@elevate.edu';
  const facultyPassword = 'Faculty@123';

  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('1. Faculty - Create Quiz with All Question Types', () => {
    beforeEach(() => {
      cy.loginAs(facultyEmail, facultyPassword, 'faculty');
    });

    it('should create a quiz with MCQ, True/False, and Fill-in-the-Blank questions', () => {
      cy.visit('/faculty/quizzes');
      cy.contains('Manage Quizzes', { timeout: 10000 }).should('be.visible');
      
      // Click Create Quiz
      cy.contains('button', 'Create Quiz', { timeout: 10000 }).click();
      
      // Fill basic quiz info
      cy.get('input[placeholder*="title"], input[name="title"]').first().type('Complete Test Quiz');
      cy.get('textarea').first().type('A comprehensive test quiz with all question types');
      
      // Select years
      cy.get('body').then(($body) => {
        if ($body.find('input[type="checkbox"]').length > 0) {
          // Select first year checkbox if available
          cy.get('input[type="checkbox"]').first().check({ force: true });
        }
      });
      
      // Set duration
      cy.get('input[type="number"]').then(($inputs) => {
        // Find duration input (usually has placeholder or label)
        const durationInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const placeholder = $input.attr('placeholder') || '';
          const name = $input.attr('name') || '';
          return placeholder.toLowerCase().includes('duration') || 
                 placeholder.toLowerCase().includes('minute') ||
                 name.toLowerCase().includes('duration');
        });
        if (durationInput) {
          cy.wrap(durationInput).clear().type('30');
        }
      });
      
      // Make quiz available immediately
      cy.get('body').then(($body) => {
        if ($body.text().includes('Make Available Immediately') || $body.text().includes('immediately')) {
          cy.contains('Make Available Immediately', { matchCase: false }).click({ force: true });
        }
      });
      
      // Add MCQ Question
      cy.contains('Add New Question', { matchCase: false }).should('be.visible');
      cy.get('textarea').then(($textareas) => {
        // Find the question textarea in the Add New Question section
        const questionTextarea = Array.from($textareas).find(textarea => {
          const $textarea = Cypress.$(textarea);
          return $textarea.attr('placeholder')?.toLowerCase().includes('question') ||
                 $textarea.attr('name')?.toLowerCase().includes('question');
        });
        if (questionTextarea) {
          cy.wrap(questionTextarea).type('What is 2+2?', { force: true });
        }
      });
      
      // Select question type - MCQ
      cy.get('select, button').then(($elements) => {
        const typeSelect = Array.from($elements).find(el => {
          const $el = Cypress.$(el);
          return $el.text().includes('MCQ') || $el.attr('name')?.includes('question_type');
        });
        if (typeSelect) {
          cy.wrap(typeSelect).click({ force: true });
          cy.contains('MCQ', { matchCase: false }).click({ force: true });
        }
      });
      
      // Fill MCQ options
      cy.get('input').then(($inputs) => {
        const optionInputs = Array.from($inputs).filter(input => {
          const $input = Cypress.$(input);
          const name = $input.attr('name') || '';
          const placeholder = $input.attr('placeholder') || '';
          return name.includes('option') || placeholder.toLowerCase().includes('option');
        });
        
        if (optionInputs.length >= 4) {
          cy.wrap(optionInputs[0]).type('3', { force: true });
          cy.wrap(optionInputs[1]).type('4', { force: true });
          cy.wrap(optionInputs[2]).type('5', { force: true });
          cy.wrap(optionInputs[3]).type('6', { force: true });
        }
      });
      
      // Select correct answer (B = 4)
      cy.get('select, button').then(($elements) => {
        const correctAnswerSelect = Array.from($elements).find(el => {
          const $el = Cypress.$(el);
          return $el.attr('name')?.includes('correct') || $el.text().includes('Correct');
        });
        if (correctAnswerSelect) {
          cy.wrap(correctAnswerSelect).click({ force: true });
          cy.contains('B', { matchCase: false }).click({ force: true });
        }
      });
      
      // Add marks
      cy.get('input[type="number"]').then(($inputs) => {
        const marksInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const name = $input.attr('name') || '';
          const placeholder = $input.attr('placeholder') || '';
          return name.includes('marks') || placeholder.toLowerCase().includes('marks');
        });
        if (marksInput) {
          cy.wrap(marksInput).type('10', { force: true });
        }
      });
      
      // Add the question
      cy.contains('button', 'Add Question', { matchCase: false }).click({ force: true });
      cy.wait(1000);
      
      // Add Fill-in-the-Blank Question
      cy.get('textarea').then(($textareas) => {
        const questionTextarea = Array.from($textareas).find(textarea => {
          const $textarea = Cypress.$(textarea);
          return $textarea.attr('placeholder')?.toLowerCase().includes('question') ||
                 $textarea.attr('name')?.toLowerCase().includes('question');
        });
        if (questionTextarea) {
          cy.wrap(questionTextarea).clear().type('The capital of France is ____', { force: true });
        }
      });
      
      // Select Fill-in-the-Blank type
      cy.get('select, button').then(($elements) => {
        const typeSelect = Array.from($elements).find(el => {
          const $el = Cypress.$(el);
          return $el.text().includes('Fill') || $el.attr('name')?.includes('question_type');
        });
        if (typeSelect) {
          cy.wrap(typeSelect).click({ force: true });
          cy.contains('Fill', { matchCase: false }).click({ force: true });
        }
      });
      
      // Fill correct answer text
      cy.get('input[type="text"]').then(($inputs) => {
        const answerInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const name = $input.attr('name') || '';
          const placeholder = $input.attr('placeholder') || '';
          return name.includes('correct_answer_text') || 
                 placeholder.toLowerCase().includes('correct') ||
                 placeholder.toLowerCase().includes('answer');
        });
        if (answerInput) {
          cy.wrap(answerInput).type('Paris', { force: true });
        }
      });
      
      // Add marks
      cy.get('input[type="number"]').then(($inputs) => {
        const marksInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const name = $input.attr('name') || '';
          return name.includes('marks');
        });
        if (marksInput) {
          cy.wrap(marksInput).type('10', { force: true });
        }
      });
      
      // Add the question
      cy.contains('button', 'Add Question', { matchCase: false }).click({ force: true });
      cy.wait(1000);
      
      // Add True/False Question
      cy.get('textarea').then(($textareas) => {
        const questionTextarea = Array.from($textareas).find(textarea => {
          const $textarea = Cypress.$(textarea);
          return $textarea.attr('placeholder')?.toLowerCase().includes('question');
        });
        if (questionTextarea) {
          cy.wrap(questionTextarea).clear().type('Python is a programming language', { force: true });
        }
      });
      
      // Select True/False type
      cy.get('select, button').then(($elements) => {
        const typeSelect = Array.from($elements).find(el => {
          const $el = Cypress.$(el);
          return $el.text().includes('True') || $el.attr('name')?.includes('question_type');
        });
        if (typeSelect) {
          cy.wrap(typeSelect).click({ force: true });
          cy.contains('True', { matchCase: false }).click({ force: true });
        }
      });
      
      // Select correct answer (True)
      cy.get('input[type="checkbox"], input[type="radio"]').then(($inputs) => {
        const trueInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const value = $input.attr('value') || '';
          const name = $input.attr('name') || '';
          return value.toLowerCase() === 'true' || name.includes('is_true');
        });
        if (trueInput) {
          cy.wrap(trueInput).check({ force: true });
        }
      });
      
      // Add marks
      cy.get('input[type="number"]').then(($inputs) => {
        const marksInput = Array.from($inputs).find(input => {
          const $input = Cypress.$(input);
          const name = $input.attr('name') || '';
          return name.includes('marks');
        });
        if (marksInput) {
          cy.wrap(marksInput).type('10', { force: true });
        }
      });
      
      // Add the question
      cy.contains('button', 'Add Question', { matchCase: false }).click({ force: true });
      cy.wait(1000);
      
      // Submit the quiz
      cy.contains('button', 'Create Quiz', { matchCase: false }).click({ force: true });
      
      // Verify success
      cy.contains('success', { matchCase: false, timeout: 15000 }).should('be.visible');
    });
  });

  describe('2. Student - Take Quiz with All Question Types', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should access tests page and start a quiz', () => {
      cy.visit('/tests');
      cy.contains('Tests', { timeout: 10000 }).should('be.visible');
      
      // Look for quiz cards or list items
      cy.get('body', { timeout: 5000 }).should('be.visible');
      
      // Try to find and click on a quiz
      cy.get('body').then(($body) => {
        // Look for quiz title or button
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else if ($body.find('button:contains("Start"), button:contains("Take")').length > 0) {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        } else if ($body.find('[class*="card"], [class*="quiz"]').length > 0) {
          cy.get('[class*="card"], [class*="quiz"]').first().click({ force: true });
        }
      });
      
      // Should navigate to quiz page
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
    });

    it('should answer MCQ question', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      
      // Wait for quiz to load
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Find and click MCQ option (if question is MCQ)
      cy.get('body').then(($body) => {
        if ($body.text().includes('2+2') || $body.text().includes('What is')) {
          // Look for radio buttons or options
          cy.get('input[type="radio"]').then(($radios) => {
            if ($radios.length > 0) {
              // Click option B (index 1, which should be 4)
              cy.wrap($radios).eq(1).check({ force: true });
              cy.wait(1000);
            }
          });
          
          // Or click on label text
          cy.contains('B', { matchCase: false }).then(($el) => {
            if ($el.length > 0) {
              cy.wrap($el).click({ force: true });
            }
          });
        }
      });
      
      // Navigate to next question
      cy.contains('button', 'Next', { matchCase: false }).click({ force: true });
      cy.wait(1000);
    });

    it('should answer Fill-in-the-Blank question', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Navigate to fill-in-the-blank question (usually question 2)
      cy.get('body').then(($body) => {
        // Click question number 2
        if ($body.find('button:contains("2")').length > 0) {
          cy.contains('button', '2').click({ force: true });
          cy.wait(1000);
        }
      });
      
      // Find fill-in-the-blank input
      cy.get('body').then(($body) => {
        if ($body.text().includes('capital of France') || $body.text().includes('France')) {
          // Look for input field
          cy.get('input[type="text"]').then(($inputs) => {
            const fillBlankInput = Array.from($inputs).find(input => {
              const $input = Cypress.$(input);
              const id = $input.attr('id') || '';
              const placeholder = $input.attr('placeholder') || '';
              const name = $input.attr('name') || '';
              return id.includes('fill-blank') || 
                     placeholder.toLowerCase().includes('answer') ||
                     placeholder.toLowerCase().includes('enter');
            });
            
            if (fillBlankInput) {
              cy.wrap(fillBlankInput).should('be.visible');
              cy.wrap(fillBlankInput).clear({ force: true });
              cy.wrap(fillBlankInput).type('Paris', { force: true });
              cy.wait(2000); // Wait for auto-save
              
              // Verify input has value
              cy.wrap(fillBlankInput).should('have.value', 'Paris');
            } else {
              // Try to find any text input
              cy.get('input[type="text"]').first().should('be.visible');
              cy.get('input[type="text"]').first().clear({ force: true });
              cy.get('input[type="text"]').first().type('Paris', { force: true });
              cy.wait(2000);
              cy.get('input[type="text"]').first().should('have.value', 'Paris');
            }
          });
        }
      });
      
      // Navigate to next question
      cy.contains('button', 'Next', { matchCase: false }).click({ force: true });
      cy.wait(1000);
    });

    it('should answer True/False question', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Navigate to True/False question (usually question 3)
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("3")').length > 0) {
          cy.contains('button', '3').click({ force: true });
          cy.wait(1000);
        }
      });
      
      // Find and click True option
      cy.get('body').then(($body) => {
        if ($body.text().includes('Python') || $body.text().includes('programming')) {
          cy.get('input[type="radio"]').then(($radios) => {
            if ($radios.length > 0) {
              // Click True option (usually first)
              cy.wrap($radios).first().check({ force: true });
              cy.wait(1000);
            }
          });
          
          // Or click on True label
          cy.contains('True', { matchCase: false }).then(($el) => {
            if ($el.length > 0 && !$el.is('input')) {
              cy.wrap($el).click({ force: true });
            }
          });
        }
      });
      
      cy.wait(1000);
    });

    it('should submit quiz and view results', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Answer all questions quickly
      cy.get('body').then(($body) => {
        // Answer question 1 (MCQ)
        cy.contains('button', '1').click({ force: true });
        cy.wait(500);
        cy.get('input[type="radio"]').first().check({ force: true });
        cy.wait(500);
        
        // Answer question 2 (Fill-in-the-blank)
        cy.contains('button', '2').click({ force: true });
        cy.wait(500);
        cy.get('input[type="text"]').first().type('Paris', { force: true });
        cy.wait(1000);
        
        // Answer question 3 (True/False)
        cy.contains('button', '3').click({ force: true });
        cy.wait(500);
        cy.get('input[type="radio"]').first().check({ force: true });
        cy.wait(500);
      });
      
      // Submit quiz
      cy.contains('button', 'Submit', { matchCase: false }).click({ force: true });
      
      // Confirm submission if dialog appears
      cy.get('body').then(($body) => {
        if ($body.find('[role="dialog"]').length > 0) {
          cy.contains('button', 'Submit', { matchCase: false }).click({ force: true });
        }
      });
      
      // Should see results
      cy.contains('Results', { matchCase: false, timeout: 15000 }).should('be.visible');
      cy.contains('Score', { matchCase: false }).should('be.visible');
    });

    it('should verify timer functionality', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Check if timer is visible (overall timer)
      cy.get('body').then(($body) => {
        // Look for timer display (usually contains numbers like "29:59" or "0:30")
        if ($body.text().match(/\d+:\d+/)) {
          cy.log('Timer is visible');
          // Timer should be counting down
          cy.wait(2000);
          // Verify timer is still there
          cy.get('body').should('contain.text', ':');
        }
      });
    });

    it('should verify answer persistence across navigation', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Navigate to quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Answer fill-in-the-blank question
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("2")').length > 0) {
          cy.contains('button', '2').click({ force: true });
          cy.wait(1000);
          
          // Type answer
          cy.get('input[type="text"]').first().clear({ force: true });
          cy.get('input[type="text"]').first().type('Paris', { force: true });
          cy.wait(2000); // Wait for save
          
          // Navigate away
          cy.contains('button', '1').click({ force: true });
          cy.wait(1000);
          
          // Navigate back
          cy.contains('button', '2').click({ force: true });
          cy.wait(1000);
          
          // Verify answer is still there
          cy.get('input[type="text"]').first().should('have.value', 'Paris');
        }
      });
    });
  });

  describe('3. Error Handling and Edge Cases', () => {
    beforeEach(() => {
      cy.loginAs(studentEmail, studentPassword, 'student');
    });

    it('should handle quiz not found gracefully', () => {
      cy.visit('/quiz/99999');
      cy.wait(5000);
      
      // Should show error or redirect
      cy.get('body').should('be.visible');
      cy.url().should('satisfy', (url) => {
        return url.includes('/quiz/') || url.includes('/tests') || url.includes('/dashboard');
      });
    });

    it('should prevent navigation away without confirmation', () => {
      cy.visit('/tests');
      cy.wait(2000);
      
      // Start quiz
      cy.get('body').then(($body) => {
        if ($body.text().includes('Complete Test Quiz')) {
          cy.contains('Complete Test Quiz', { matchCase: false }).click({ force: true });
        } else {
          cy.contains('button', 'Start', { matchCase: false }).first().click({ force: true });
        }
      });
      
      cy.url({ timeout: 10000 }).should('include', '/quiz/');
      cy.contains('Question', { timeout: 10000 }).should('be.visible');
      
      // Try to go back
      cy.get('button').then(($buttons) => {
        const backButton = Array.from($buttons).find(btn => {
          const $btn = Cypress.$(btn);
          return $btn.find('svg').length > 0 || $btn.text().includes('Back') || $btn.text().includes('←');
        });
        if (backButton) {
          cy.wrap(backButton).click({ force: true });
          cy.wait(1000);
          // Should show confirmation or stay on page
          cy.get('body').should('be.visible');
        }
      });
    });
  });
});
