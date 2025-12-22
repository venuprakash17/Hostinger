#!/usr/bin/env python3
"""
Comprehensive Endpoint Testing Script
Tests all API endpoints to ensure they work correctly
Can be run locally or against server
"""

import requests
import json
import sys
import os
from typing import Dict, Optional, List
from datetime import datetime

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class EndpointTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.token: Optional[str] = None
        self.results: List[Dict] = []
        self.stats = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'skipped': 0
        }
    
    def log(self, message: str, color: str = Colors.RESET):
        print(f"{color}{message}{Colors.RESET}")
    
    def test_endpoint(self, method: str, endpoint: str, name: str, 
                     data: Optional[Dict] = None, 
                     expected_status: int = 200,
                     requires_auth: bool = True,
                     skip_if_no_auth: bool = False) -> bool:
        """Test a single endpoint"""
        self.stats['total'] += 1
        url = f"{self.base_url}{endpoint}"
        
        headers = {}
        if requires_auth:
            if not self.token:
                if skip_if_no_auth:
                    self.stats['skipped'] += 1
                    self.log(f"⏭️  SKIPPED: {name} (no auth)", Colors.YELLOW)
                    return True
                else:
                    self.stats['failed'] += 1
                    self.log(f"❌ FAILED: {name} - No authentication token", Colors.RED)
                    self.results.append({
                        'name': name,
                        'endpoint': endpoint,
                        'status': 'FAILED',
                        'error': 'No authentication token'
                    })
                    return False
            headers['Authorization'] = f'Bearer {self.token}'
        
        headers['Content-Type'] = 'application/json'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                self.stats['failed'] += 1
                self.log(f"❌ FAILED: {name} - Invalid method: {method}", Colors.RED)
                return False
            
            if response.status_code == expected_status:
                self.stats['passed'] += 1
                self.log(f"✅ PASSED: {name} ({response.status_code})", Colors.GREEN)
                self.results.append({
                    'name': name,
                    'endpoint': endpoint,
                    'method': method,
                    'status': 'PASSED',
                    'status_code': response.status_code
                })
                return True
            else:
                self.stats['failed'] += 1
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        error_msg += f": {error_data['detail']}"
                except:
                    error_msg += f": {response.text[:100]}"
                
                self.log(f"❌ FAILED: {name} - {error_msg}", Colors.RED)
                self.results.append({
                    'name': name,
                    'endpoint': endpoint,
                    'method': method,
                    'status': 'FAILED',
                    'status_code': response.status_code,
                    'error': error_msg
                })
                return False
                
        except requests.exceptions.Timeout:
            self.stats['failed'] += 1
            self.log(f"❌ FAILED: {name} - Request timeout", Colors.RED)
            self.results.append({
                'name': name,
                'endpoint': endpoint,
                'status': 'FAILED',
                'error': 'Request timeout'
            })
            return False
        except Exception as e:
            self.stats['failed'] += 1
            self.log(f"❌ FAILED: {name} - {str(e)}", Colors.RED)
            self.results.append({
                'name': name,
                'endpoint': endpoint,
                'status': 'FAILED',
                'error': str(e)
            })
            return False
    
    def authenticate(self, email: str, password: str) -> bool:
        """Authenticate and get token"""
        try:
            url = f"{self.base_url}/auth/login"
            response = requests.post(url, json={
                'email': email,
                'password': password
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                if self.token:
                    self.log(f"✅ Authentication successful", Colors.GREEN)
                    return True
                else:
                    self.log(f"❌ Authentication failed: No token in response", Colors.RED)
                    return False
            else:
                self.log(f"❌ Authentication failed: {response.status_code}", Colors.RED)
                try:
                    error = response.json()
                    self.log(f"   Error: {error.get('detail', 'Unknown error')}", Colors.RED)
                except:
                    self.log(f"   Error: {response.text[:100]}", Colors.RED)
                return False
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", Colors.RED)
            return False
    
    def test_all_endpoints(self):
        """Test all endpoints"""
        self.log(f"\n{Colors.BOLD}{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.RESET}")
        self.log(f"{Colors.BOLD}{Colors.BLUE}🧪 COMPREHENSIVE ENDPOINT TESTING{Colors.RESET}")
        self.log(f"{Colors.BOLD}{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.RESET}\n")
        
        # Test authentication endpoints (no auth required)
        self.log(f"\n{Colors.BOLD}1. Authentication Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/auth/me', 'Get Current User (no auth)', requires_auth=False, expected_status=401)
        
        # Test health/status endpoints
        self.log(f"\n{Colors.BOLD}2. Health/Status Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/', 'Root endpoint', requires_auth=False, expected_status=200, skip_if_no_auth=True)
        
        # Test colleges endpoints
        self.log(f"\n{Colors.BOLD}3. Colleges Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/colleges', 'List Colleges', requires_auth=False, expected_status=200)
        self.test_endpoint('GET', '/colleges?limit=10', 'List Colleges (paginated)', requires_auth=False, expected_status=200)
        
        # Test institutions endpoints
        self.log(f"\n{Colors.BOLD}4. Institutions Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/institutions', 'List Institutions', expected_status=200)
        self.test_endpoint('GET', '/institutions?limit=10', 'List Institutions (paginated)', expected_status=200)
        
        # Test users endpoints
        self.log(f"\n{Colors.BOLD}5. Users Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/users', 'List Users', expected_status=200)
        self.test_endpoint('GET', '/users?limit=50', 'List Users (paginated)', expected_status=200)
        self.test_endpoint('GET', '/users?role=student', 'List Users (filtered by role)', expected_status=200)
        
        # Test coding problems endpoints
        self.log(f"\n{Colors.BOLD}6. Coding Problems Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/coding-problems', 'List Coding Problems', expected_status=200)
        self.test_endpoint('GET', '/coding-problems?limit=50', 'List Coding Problems (paginated)', expected_status=200)
        self.test_endpoint('GET', '/coding-problems?difficulty=easy', 'List Coding Problems (filtered)', expected_status=200)
        
        # Test quizzes endpoints
        self.log(f"\n{Colors.BOLD}7. Quizzes Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/quizzes', 'List Quizzes', expected_status=200)
        self.test_endpoint('GET', '/quizzes?limit=50', 'List Quizzes (paginated)', expected_status=200)
        
        # Test jobs endpoints
        self.log(f"\n{Colors.BOLD}8. Jobs Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/jobs', 'List Jobs', expected_status=200)
        self.test_endpoint('GET', '/jobs?is_active=true', 'List Jobs (active)', expected_status=200)
        self.test_endpoint('GET', '/jobs?limit=50', 'List Jobs (paginated)', expected_status=200)
        
        # Test job aggregation endpoints
        self.log(f"\n{Colors.BOLD}9. Job Aggregation Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/job-aggregation', 'List Aggregated Jobs', expected_status=200)
        self.test_endpoint('GET', '/job-aggregation?limit=50', 'List Aggregated Jobs (paginated)', expected_status=200)
        
        # Test coding labs endpoints
        self.log(f"\n{Colors.BOLD}10. Coding Labs Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/coding-labs', 'List Coding Labs', expected_status=200)
        self.test_endpoint('GET', '/coding-labs?limit=50', 'List Coding Labs (paginated)', expected_status=200)
        
        # Test notifications endpoints
        self.log(f"\n{Colors.BOLD}11. Notifications Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/notifications', 'List Notifications', expected_status=200)
        self.test_endpoint('GET', '/notifications?limit=50', 'List Notifications (paginated)', expected_status=200)
        
        # Test analytics endpoints
        self.log(f"\n{Colors.BOLD}12. Analytics Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/analytics/drilldown/admin/overview', 'Admin Overview Analytics', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/analytics/dashboard/comprehensive', 'Comprehensive Dashboard', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/analytics/student/my-progress', 'Student Progress', expected_status=200, skip_if_no_auth=True)
        
        # Test bulk upload endpoints
        self.log(f"\n{Colors.BOLD}13. Bulk Upload Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/bulk-upload/template/students?format=csv', 'Download Student Template', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/bulk-upload/template/staff?format=csv', 'Download Staff Template', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/bulk-upload/template/institution-students?format=csv', 'Download Institution Student Template', expected_status=200, skip_if_no_auth=True)
        
        # Test academic endpoints
        self.log(f"\n{Colors.BOLD}14. Academic Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/academic/departments', 'List Departments', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/academic/sections', 'List Sections', expected_status=200, skip_if_no_auth=True)
        
        # Test training sessions endpoints
        self.log(f"\n{Colors.BOLD}15. Training Sessions Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/training-sessions', 'List Training Sessions', expected_status=200, skip_if_no_auth=True)
        
        # Test attendance endpoints
        self.log(f"\n{Colors.BOLD}16. Attendance Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/attendance', 'List Attendance', expected_status=200, skip_if_no_auth=True)
        
        # Test resume endpoints
        self.log(f"\n{Colors.BOLD}17. Resume Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/resume/profile', 'Get Resume Profile', expected_status=200, skip_if_no_auth=True)
        
        # Test mock interviews endpoints
        self.log(f"\n{Colors.BOLD}18. Mock Interviews Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/mock-interviews', 'List Mock Interviews', expected_status=200, skip_if_no_auth=True)
        
        # Test hall tickets endpoints
        self.log(f"\n{Colors.BOLD}19. Hall Tickets Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/hall-tickets', 'List Hall Tickets', expected_status=200, skip_if_no_auth=True)
        
        # Test announcements endpoints
        self.log(f"\n{Colors.BOLD}20. Announcements Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/announcements', 'List Announcements', expected_status=200, skip_if_no_auth=True)
        
        # Test company training endpoints
        self.log(f"\n{Colors.BOLD}21. Company Training Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/company-training', 'List Company Training', expected_status=200, skip_if_no_auth=True)
        
        # Test user profile endpoints
        self.log(f"\n{Colors.BOLD}22. User Profile Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/users/me/roles', 'Get My Roles', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/users/me/profile', 'Get My Profile', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/users/all-students', 'Get All Students', expected_status=200, skip_if_no_auth=True)
        
        # Test analytics drilldown endpoints
        self.log(f"\n{Colors.BOLD}23. Analytics Drilldown Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/analytics/drilldown/admin/overview', 'Admin Overview', expected_status=200, skip_if_no_auth=True)
        
        # Test global content endpoints
        self.log(f"\n{Colors.BOLD}24. Global Content Endpoints{Colors.RESET}")
        self.test_endpoint('GET', '/global-content/quizzes', 'List Global Quizzes', expected_status=200, skip_if_no_auth=True)
        self.test_endpoint('GET', '/global-content/coding-problems', 'List Global Coding Problems', expected_status=200, skip_if_no_auth=True)
    
    def print_summary(self):
        """Print test summary"""
        self.log(f"\n{Colors.BOLD}{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.RESET}")
        self.log(f"{Colors.BOLD}📊 TEST SUMMARY{Colors.RESET}")
        self.log(f"{Colors.BOLD}{Colors.BLUE}═══════════════════════════════════════════════════════════{Colors.RESET}\n")
        
        total = self.stats['total']
        passed = self.stats['passed']
        failed = self.stats['failed']
        skipped = self.stats['skipped']
        
        self.log(f"Total Tests: {total}")
        self.log(f"{Colors.GREEN}✅ Passed: {passed}{Colors.RESET}")
        self.log(f"{Colors.RED}❌ Failed: {failed}{Colors.RESET}")
        self.log(f"{Colors.YELLOW}⏭️  Skipped: {skipped}{Colors.RESET}")
        
        if total > 0:
            success_rate = (passed / total) * 100
            self.log(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if failed > 0:
            self.log(f"\n{Colors.BOLD}{Colors.RED}Failed Tests:{Colors.RESET}")
            for result in self.results:
                if result['status'] == 'FAILED':
                    self.log(f"  ❌ {result['name']}: {result.get('error', 'Unknown error')}", Colors.RED)
        
        # Save results to file
        report_file = f"endpoint-test-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'base_url': self.base_url,
                'stats': self.stats,
                'results': self.results
            }, f, indent=2)
        
        self.log(f"\n📄 Detailed report saved to: {report_file}")
        
        return failed == 0

def main():
    # Get base URL from environment or use default
    base_url = os.getenv('API_BASE_URL', 'http://localhost:8090/api/v1')
    
    # Get credentials from environment or use defaults
    email = os.getenv('TEST_EMAIL', 'superadmin@test.com')
    password = os.getenv('TEST_PASSWORD', 'SuperAdmin123!')
    
    print(f"\n{Colors.BOLD}Configuration:{Colors.RESET}")
    print(f"  Base URL: {base_url}")
    print(f"  Test Email: {email}")
    print(f"  Test Password: {'*' * len(password)}")
    print()
    
    tester = EndpointTester(base_url)
    
    # Authenticate
    if not tester.authenticate(email, password):
        print(f"\n{Colors.RED}⚠️  Warning: Authentication failed. Some tests will be skipped.{Colors.RESET}\n")
    
    # Run all tests
    tester.test_all_endpoints()
    
    # Print summary
    success = tester.print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()

