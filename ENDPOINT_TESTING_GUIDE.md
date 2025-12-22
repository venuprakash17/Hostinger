# Endpoint Testing Guide

## Overview

This guide explains how to test all API endpoints to ensure they work correctly both locally and on your server.

## Quick Start

### Option 1: Automated Testing Script

```bash
# Run the automated test script
./test-endpoints.sh

# Or with environment variables
API_BASE_URL="http://localhost:8090/api/v1" \
TEST_EMAIL="superadmin@test.com" \
TEST_PASSWORD="your_password" \
./test-endpoints.sh
```

### Option 2: Direct Python Script

```bash
# Test local server
python3 test-all-endpoints.py

# Test remote server
API_BASE_URL="https://your-server.com/api/v1" \
TEST_EMAIL="superadmin@test.com" \
TEST_PASSWORD="your_password" \
python3 test-all-endpoints.py
```

## What Gets Tested

The test script validates:

1. **Authentication Endpoints**
   - Login
   - Get current user

2. **Colleges Endpoints**
   - List colleges
   - Pagination

3. **Institutions Endpoints**
   - List institutions
   - Pagination

4. **Users Endpoints**
   - List users
   - Filter by role
   - Pagination

5. **Coding Problems Endpoints**
   - List problems
   - Filter by difficulty
   - Pagination

6. **Quizzes Endpoints**
   - List quizzes
   - Pagination

7. **Jobs Endpoints**
   - List jobs
   - Filter by status
   - Pagination

8. **Job Aggregation Endpoints**
   - List aggregated jobs
   - Pagination

9. **Coding Labs Endpoints**
   - List labs
   - Pagination

10. **Notifications Endpoints**
    - List notifications
    - Pagination

11. **Analytics Endpoints**
    - Admin overview
    - Comprehensive dashboard
    - Student progress

12. **Bulk Upload Endpoints**
    - Template downloads

13. **Academic Endpoints**
    - Departments
    - Sections

14. **Training Sessions Endpoints**
    - List sessions

15. **Attendance Endpoints**
    - List attendance

16. **Resume Endpoints**
    - Get profile

17. **Mock Interviews Endpoints**
    - List interviews

18. **Hall Tickets Endpoints**
    - List tickets

19. **Announcements Endpoints**
    - List announcements

## Test Results

After running tests, you'll get:

- ✅ **Passed**: Endpoint responded correctly
- ❌ **Failed**: Endpoint returned error or wrong status
- ⏭️ **Skipped**: Test skipped (usually due to missing auth)

A detailed JSON report is saved with timestamp:
- `endpoint-test-report-YYYYMMDD-HHMMSS.json`

## Testing on Server

To test on your production server:

```bash
# Set server URL
export API_BASE_URL="https://your-server.com/api/v1"

# Set credentials
export TEST_EMAIL="your_admin_email"
export TEST_PASSWORD="your_password"

# Run tests
./test-endpoints.sh
```

## Expected Results

### Local Development
- All endpoints should respond
- Some may return 401 if not authenticated (expected)
- Pagination should work correctly

### Production Server
- All endpoints should work the same as local
- Authentication should work
- Response times should be reasonable (< 2 seconds)

## Troubleshooting

### Authentication Fails
- Check credentials are correct
- Verify server is running
- Check network connectivity

### Endpoints Return 500
- Check server logs
- Verify database connection
- Check environment variables

### Timeout Errors
- Increase timeout in script (default: 10 seconds)
- Check server performance
- Verify network connection

## Manual Testing

For manual testing, use:

```bash
# Test a specific endpoint
curl -X GET "http://localhost:8090/api/v1/colleges" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with authentication
curl -X POST "http://localhost:8090/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@test.com","password":"SuperAdmin123!"}'
```

## Continuous Testing

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Test API Endpoints
  run: |
    export API_BASE_URL="${{ secrets.API_BASE_URL }}"
    export TEST_EMAIL="${{ secrets.TEST_EMAIL }}"
    export TEST_PASSWORD="${{ secrets.TEST_PASSWORD }}"
    python3 test-all-endpoints.py
```

## Notes

- Tests are non-destructive (read-only operations)
- Some endpoints may require specific roles
- Pagination limits are tested
- Response times are logged

