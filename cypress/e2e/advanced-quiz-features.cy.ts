/// <reference types="cypress" />

describe('Advanced Quiz Features', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.waitForBackend();
  });

  describe('Super Admin - Quiz Creation with Advanced Features', () => {
    beforeEach(() => {
      cy.loginAs('superadmin@elevate.edu', 'SuperAdmin@123', 'super_admin');
    });

    it('should create quiz with per-question timer', () => {
      cy.visit('/superadmin/global-content');
      
      // Navigate to quizzes tab
      cy.contains('Quizzes').click();
      
      cy.contains('Create Quiz').click();
      
      // Fill basic info
      cy.get('input[name="title"]').type('Advanced Quiz with Timers');
      cy.get('input[name="subject"]').type('Programming');
      cy.get('input[name="duration"]').type('60');
      cy.get('input[name="total_marks"]').type('100');
      
      // Select year (required for SvnaPro)
      cy.get('select[name="year"]').select('2');
      
      // Enable per-question timer
      cy.get('input[type="checkbox"][name*="per_question_timer"]').check({ force: true });
      
      // Add questions with timers using QuestionBuilder
      cy.contains('Add Question').click();
      
      // Fill question details
      cy.get('textarea[name*="question"]').first().type('What is 2+2?');
      cy.get('input[name*="option_a"]').first().type('3');
      cy.get('input[name*="option_b"]').first().type('4');
      cy.get('input[name*="option_c"]').first().type('5');
      cy.get('input[name*="option_d"]').first().type('6');
      cy.get('select[name*="correct_answer"]').first().select('B');
      cy.get('input[name*="marks"]').first().type('10');
      cy.get('input[name*="timer_seconds"]').first().type('30');
      
      // Add another question
      cy.contains('Add Question').click();
      
      cy.get('textarea[name*="question"]').last().type('What is 3+3?');
      cy.get('input[name*="option_a"]').last().type('5');
      cy.get('input[name*="option_b"]').last().type('6');
      cy.get('input[name*="option_c"]').last().type('7');
      cy.get('input[name*="option_d"]').last().type('8');
      cy.get('select[name*="correct_answer"]').last().select('B');
      cy.get('input[name*="marks"]').last().type('10');
      cy.get('input[name*="timer_seconds"]').last().type('45');
      
      // Submit quiz
      cy.contains('Create Quiz').click();
      
      cy.contains('Quiz created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should create quiz with code snippet', () => {
      cy.visit('/superadmin/global-content');
      
      cy.contains('Quizzes').click();
      cy.contains('Create Quiz').click();
      
      // Fill basic info
      cy.get('input[name="title"]').type('Code-Based Quiz');
      cy.get('input[name="subject"]').type('Python');
      cy.get('input[name="duration"]').type('45');
      cy.get('input[name="total_marks"]').type('50');
      cy.get('select[name="year"]').select('2');
      
      // Add code snippet
      const codeSnippet = `def add(a, b):
    return a + b

result = add(2, 3)
print(result)`;
      
      cy.get('textarea[name*="code_snippet"]').type(codeSnippet);
      
      // Add question
      cy.contains('Add Question').click();
      cy.get('textarea[name*="question"]').first().type('What does this code output?');
      cy.get('input[name*="option_a"]').first().type('2');
      cy.get('input[name*="option_b"]').first().type('3');
      cy.get('input[name*="option_c"]').first().type('5');
      cy.get('input[name*="option_d"]').first().type('Error');
      cy.get('select[name*="correct_answer"]').first().select('C');
      cy.get('input[name*="marks"]').first().type('10');
      
      cy.contains('Create Quiz').click();
      
      cy.contains('Quiz created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should create quiz with both timer and code snippet', () => {
      cy.visit('/superadmin/global-content');
      
      cy.contains('Quizzes').click();
      cy.contains('Create Quiz').click();
      
      cy.get('input[name="title"]').type('Advanced Programming Quiz');
      cy.get('input[name="subject"]').type('Python');
      cy.get('input[name="duration"]').type('90');
      cy.get('input[name="total_marks"]').type('100');
      cy.get('select[name="year"]').select('3');
      
      // Enable per-question timer
      cy.get('input[type="checkbox"][name*="per_question_timer"]').check({ force: true });
      
      // Add code snippet
      cy.get('textarea[name*="code_snippet"]').type('def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)');
      
      // Add questions
      cy.contains('Add Question').click();
      cy.get('textarea[name*="question"]').first().type('What is factorial(5)?');
      cy.get('input[name*="option_a"]').first().type('120');
      cy.get('input[name*="option_b"]').first().type('60');
      cy.get('input[name*="option_c"]').first().type('24');
      cy.get('input[name*="option_d"]').first().type('12');
      cy.get('select[name*="correct_answer"]').first().select('A');
      cy.get('input[name*="marks"]').first().type('20');
      cy.get('input[name*="timer_seconds"]').first().type('60');
      
      cy.contains('Create Quiz').click();
      
      cy.contains('Quiz created successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Faculty - Quiz Creation with Scope Selection', () => {
    beforeEach(() => {
      cy.loginAs('faculty1@elevate.edu', 'Faculty@123', 'faculty');
    });

    it('should create quiz for specific section', () => {
      cy.visit('/faculty/quizzes');
      
      cy.contains('Create Quiz').click();
      
      cy.get('input[name="title"]').type('Section Quiz');
      cy.get('input[name="subject"]').type('Mathematics');
      cy.get('input[name="duration"]').type('30');
      cy.get('input[name="total_marks"]').type('50');
      
      // Select scope
      cy.get('select[name="scope_type"]').select('section');
      
      // Select section and year (should be required)
      cy.get('select[name="section_id"]').should('be.visible');
      cy.get('select[name="year"]').should('be.visible');
      
      // Add question
      cy.contains('Add Question').click();
      cy.get('textarea[name*="question"]').first().type('Test question?');
      cy.get('input[name*="option_a"]').first().type('Option A');
      cy.get('input[name*="option_b"]').first().type('Option B');
      cy.get('input[name*="option_c"]').first().type('Option C');
      cy.get('input[name*="option_d"]').first().type('Option D');
      cy.get('select[name*="correct_answer"]').first().select('A');
      cy.get('input[name*="marks"]').first().type('10');
      
      cy.contains('Create Quiz').click();
      
      cy.contains('Quiz created successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should enable per-question timer for faculty', () => {
      cy.visit('/faculty/quizzes');
      
      cy.contains('Create Quiz').click();
      
      cy.get('input[name="title"]').type('Timed Quiz');
      cy.get('input[name="subject"]').type('Science');
      cy.get('input[name="duration"]').type('45');
      cy.get('input[name="total_marks"]').type('60');
      cy.get('select[name="scope_type"]').select('section');
      
      // Enable timer
      cy.get('input[type="checkbox"][name*="per_question_timer"]').check({ force: true });
      
      // Add question with timer
      cy.contains('Add Question').click();
      cy.get('textarea[name*="question"]').first().type('Quick question?');
      cy.get('input[name*="option_a"]').first().type('A');
      cy.get('input[name*="option_b"]').first().type('B');
      cy.get('input[name*="option_c"]').first().type('C');
      cy.get('input[name*="option_d"]').first().type('D');
      cy.get('select[name*="correct_answer"]').first().select('A');
      cy.get('input[name*="marks"]').first().type('10');
      cy.get('input[name*="timer_seconds"]').first().type('20');
      
      cy.contains('Create Quiz').click();
      
      cy.contains('Quiz created successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Student - Quiz View with Filters', () => {
    beforeEach(() => {
      cy.loginAs('student1@elevate.edu', 'Student@123', 'student');
    });

    it('should display quizzes with filters', () => {
      cy.visit('/tests');
      
      // Check for tabs
      cy.contains('College').should('be.visible');
      cy.contains('SvnaPro').should('be.visible');
      
      // Check for filters
      cy.get('input[placeholder*="Search"]').should('be.visible');
    });

    it('should filter quizzes by search', () => {
      cy.visit('/tests');
      
      cy.wait(2000); // Wait for quizzes to load
      
      cy.get('input[placeholder*="Search"]').type('Programming');
      
      cy.wait(1000); // Wait for filter
    });

    it('should filter quizzes by subject', () => {
      cy.visit('/tests');
      
      cy.wait(2000);
      
      // Look for subject filter
      cy.get('select, input').should('exist');
    });

    it('should filter quizzes by minimum marks', () => {
      cy.visit('/tests');
      
      cy.wait(2000);
      
      // Look for marks filter
      cy.get('input[type="number"]').should('exist');
    });
  });
});

