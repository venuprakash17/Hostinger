# Cypress E2E Testing for Login

## Setup

1. Ensure backend is running on `http://localhost:8000`
2. Ensure frontend is running on `http://localhost:8080`
3. Install dependencies: `npm install`

## Running Tests

### Interactive Mode (Recommended for Development)
```bash
npm run cypress:open
```

### Headless Mode (CI/CD)
```bash
npm run cypress:run
```

### Run Specific Test File
```bash
npx cypress run --spec "cypress/e2e/login.cy.ts"
```

## Test Coverage

### Login Flow Tests
- ✅ UI display and validation
- ✅ Invalid credentials handling
- ✅ All role logins (Super Admin, Admin, HOD, Faculty, Student)
- ✅ Case-insensitive password support
- ✅ Loading state management
- ✅ Error handling (network, timeout)
- ✅ Role-based navigation
- ✅ Performance (login completes within 10s)

### Test Credentials

All passwords work in both uppercase and lowercase:

- **Super Admin**: `superadmin@elevate.edu` / `SA001`
- **College Admin**: `admin@elevate.edu` / `ADMIN001`
- **HOD**: `hod.cs@elevate.edu` / `HOD001`
- **Faculty**: `faculty.cs@elevate.edu` / `FAC001`
- **Student**: `student1@elevate.edu` / `STU001`

## Custom Commands

The test suite includes custom Cypress commands:

- `cy.loginAs(email, password, expectedRole)` - Login and verify navigation
- `cy.waitForBackend(timeout)` - Wait for backend to be ready
- `cy.clearAuth()` - Clear all authentication state

## Debugging

If tests fail:

1. Check backend is running: `curl http://localhost:8000/api/v1/health`
2. Check frontend is running: `curl http://localhost:8080`
3. Check browser console in Cypress
4. Check network tab in Cypress for failed requests

## CI/CD Integration

The tests are configured to:
- Run in headless mode
- Generate video recordings
- Capture screenshots on failure
- Generate HTML reports with `mochawesome`

