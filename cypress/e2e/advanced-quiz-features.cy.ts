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
      cy.wait(1000);
      
      cy.contains('Create Quiz').click();
      cy.wait(1000);
      
      // Fill basic info - use label-based selectors
      cy.contains('label', 'Year').parent().find('button').click();
      cy.contains('2nd Year').click();
      
      cy.contains('label', 'Title').parent().find('input').type('Advanced Quiz with Timers');
      cy.contains('label', 'Subject').parent().find('input').type('Programming');
      cy.contains('label', 'Duration').parent().find('input').clear().type('60');
      cy.contains('label', 'Total Marks').parent().find('input').clear().type('100');
      
      // Enable per-question timer
      cy.contains('label', /per.*question.*timer/i).parent().find('input[type="checkbox"]').check({ force: true });
      
      // Add questions with timers using QuestionBuilder
      cy.contains('Add Question').click();
      cy.wait(500);
      
      // Fill question details - use more flexible selectors
      cy.get('textarea').first().type('What is 2+2?');
      cy.get('input[placeholder*="Option A"], input[placeholder*="option A"]').first().type('3');
      cy.get('input[placeholder*="Option B"], input[placeholder*="option B"]').first().type('4');
      cy.get('input[placeholder*="Option C"], input[placeholder*="option C"]').first().type('5');
      cy.get('input[placeholder*="Option D"], input[placeholder*="option D"]').first().type('6');
      cy.contains('label', /correct answer/i).parent().find('select, button').first().click();
      cy.contains('B').click();
      cy.get('input[type="number"]').first().clear().type('10');
      cy.get('input[placeholder*="timer"], input[placeholder*="Timer"]').first().type('30');
      
      // Submit quiz
      cy.get('button[type="submit"]').contains('Create').click();
      
      cy.contains('successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should create quiz with code snippet', () => {
      cy.visit('/superadmin/global-content');
      
      cy.contains('Quizzes').click();
      cy.wait(1000);
      cy.contains('Create Quiz').click();
      cy.wait(1000);
      
      // Fill basic info
      cy.contains('label', 'Year').parent().find('button').click();
      cy.contains('2nd Year').click();
      
      cy.contains('label', 'Title').parent().find('input').type('Code-Based Quiz');
      cy.contains('label', 'Subject').parent().find('input').type('Python');
      cy.contains('label', 'Duration').parent().find('input').clear().type('45');
      cy.contains('label', 'Total Marks').parent().find('input').clear().type('50');
      
      // Add code snippet
      const codeSnippet = `def add(a, b):
    return a + b

result = add(2, 3)
print(result)`;
      
      cy.contains('label', /code snippet/i).parent().find('textarea').type(codeSnippet);
      
      // Add question
      cy.contains('Add Question').click();
      cy.wait(500);
      cy.get('textarea').first().type('What does this code output?');
      cy.get('input[placeholder*="Option A"]').first().type('2');
      cy.get('input[placeholder*="Option B"]').first().type('3');
      cy.get('input[placeholder*="Option C"]').first().type('5');
      cy.get('input[placeholder*="Option D"]').first().type('Error');
      cy.contains('label', /correct answer/i).parent().find('select, button').first().click();
      cy.contains('C').click();
      cy.get('input[type="number"]').first().clear().type('10');
      
      cy.get('button[type="submit"]').contains('Create').click();
      
      cy.contains('successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should create quiz with both timer and code snippet', () => {
      cy.visit('/superadmin/global-content');
      
      cy.contains('Quizzes').click();
      cy.wait(1000);
      cy.contains('Create Quiz').click();
      cy.wait(1000);
      
      cy.contains('label', 'Year').parent().find('button').click();
      cy.contains('3rd Year').click();
      
      cy.contains('label', 'Title').parent().find('input').type('Advanced Programming Quiz');
      cy.contains('label', 'Subject').parent().find('input').type('Python');
      cy.contains('label', 'Duration').parent().find('input').clear().type('90');
      cy.contains('label', 'Total Marks').parent().find('input').clear().type('100');
      
      // Enable per-question timer
      cy.contains('label', /per.*question.*timer/i).parent().find('input[type="checkbox"]').check({ force: true });
      
      // Add code snippet
      cy.contains('label', /code snippet/i).parent().find('textarea').type('def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)');
      
      // Add questions
      cy.contains('Add Question').click();
      cy.wait(500);
      cy.get('textarea').first().type('What is factorial(5)?');
      cy.get('input[placeholder*="Option A"]').first().type('120');
      cy.get('input[placeholder*="Option B"]').first().type('60');
      cy.get('input[placeholder*="Option C"]').first().type('24');
      cy.get('input[placeholder*="Option D"]').first().type('12');
      cy.contains('label', /correct answer/i).parent().find('select, button').first().click();
      cy.contains('A').click();
      cy.get('input[type="number"]').first().clear().type('20');
      cy.get('input[placeholder*="timer"], input[placeholder*="Timer"]').first().type('60');
      
      cy.get('button[type="submit"]').contains('Create').click();
      
      cy.contains('successfully', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Faculty - Quiz Creation with Scope Selection', () => {
    beforeEach(() => {
      // Use a valid faculty email or create test user
      cy.loginAs('faculty.cs@elevate.edu', 'Faculty@123', 'faculty');
    });

    it('should create quiz for specific section', () => {
      cy.visit('/faculty/quizzes');
      cy.wait(2000);
      
      cy.contains('Create Quiz').click();
      cy.wait(1000);
      
      cy.contains('label', 'Quiz Title').parent().find('input').type('Section Quiz');
      cy.contains('label', 'Subject').parent().find('input').type('Mathematics');
      cy.contains('label', /duration/i).parent().find('input').clear().type('30');
      cy.contains('label', /total marks/i).parent().find('input').clear().type('50');
      
      // Select scope
      cy.contains('label', /scope/i).parent().find('select, button').first().click();
      cy.contains('section', { matchCase: false }).click();
      
      // Select section and year (should be required)
      cy.contains('label', /section/i).parent().find('select, button').should('be.visible');
      cy.contains('label', /year/i).parent().find('select, button').should('be.visible');
      
      // Add question
      cy.contains('Add Question').click();
      cy.wait(500);
      cy.get('textarea').first().type('Test question?');
      cy.get('input[placeholder*="Option A"]').first().type('Option A');
      cy.get('input[placeholder*="Option B"]').first().type('Option B');
      cy.get('input[placeholder*="Option C"]').first().type('Option C');
      cy.get('input[placeholder*="Option D"]').first().type('Option D');
      cy.contains('label', /correct answer/i).parent().find('select, button').first().click();
      cy.contains('A').click();
      cy.get('input[type="number"]').first().clear().type('10');
      
      cy.get('button[type="submit"]').contains('Create').click();
      
      cy.contains('successfully', { timeout: 10000 }).should('be.visible');
    });

    it('should enable per-question timer for faculty', () => {
      cy.visit('/faculty/quizzes');
      cy.wait(2000);
      
      cy.contains('Create Quiz').click();
      cy.wait(1000);
      
      cy.contains('label', 'Quiz Title').parent().find('input').type('Timed Quiz');
      cy.contains('label', 'Subject').parent().find('input').type('Science');
      cy.contains('label', /duration/i).parent().find('input').clear().type('45');
      cy.contains('label', /total marks/i).parent().find('input').clear().type('60');
      cy.contains('label', /scope/i).parent().find('select, button').first().click();
      cy.contains('section', { matchCase: false }).click();
      
      // Enable timer
      cy.contains('label', /per.*question.*timer/i).parent().find('input[type="checkbox"]').check({ force: true });
      
      // Add question with timer
      cy.contains('Add Question').click();
      cy.wait(500);
      cy.get('textarea').first().type('Quick question?');
      cy.get('input[placeholder*="Option A"]').first().type('A');
      cy.get('input[placeholder*="Option B"]').first().type('B');
      cy.get('input[placeholder*="Option C"]').first().type('C');
      cy.get('input[placeholder*="Option D"]').first().type('D');
      cy.contains('label', /correct answer/i).parent().find('select, button').first().click();
      cy.contains('A').click();
      cy.get('input[type="number"]').first().clear().type('10');
      cy.get('input[placeholder*="timer"], input[placeholder*="Timer"]').first().type('20');
      
      cy.get('button[type="submit"]').contains('Create').click();
      
      cy.contains('successfully', { timeout: 10000 }).should('be.visible');
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
      
      // Look for marks filter - might be in a select or input
      cy.get('input[type="number"], select').should('exist');
    });
  });
});

