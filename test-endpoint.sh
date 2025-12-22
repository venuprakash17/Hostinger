#!/bin/bash
# Test the coding problems endpoint and capture errors

echo "🧪 Testing coding problems endpoint..."
echo ""

# Test 1: Simple test endpoint (no auth needed)
echo "Test 1: /test endpoint (no auth)"
curl -s "http://72.60.101.14:8000/api/v1/coding-problems/test" | jq . || echo "Failed or not JSON"
echo ""

# Test 2: Check if we can get a token (you'll need to provide credentials)
echo "Test 2: Get authentication token"
echo "Note: You need to provide login credentials"
echo ""

# Test 3: Direct database check via SSH
echo "Test 3: Check database directly"
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose exec -T backend python -c \"
from app.core.database import SessionLocal
from app.models.quiz import CodingProblem
db = SessionLocal()
try:
    count = db.query(CodingProblem).count()
    print(f'Total problems: {count}')
    if count > 0:
        p = db.query(CodingProblem).first()
        print(f'Sample problem ID: {p.id}')
        print(f'Sample problem title: {p.title}')
        print(f'Sample problem year: {p.year} (type: {type(p.year).__name__})')
        print(f'Sample problem tags: {p.tags} (type: {type(p.tags).__name__})')
        print(f'Sample problem test_cases: {type(p.test_cases).__name__}')
        print(f'Sample problem is_active: {p.is_active} (type: {type(p.is_active).__name__})')
except Exception as e:
    import traceback
    print(f'Error: {e}')
    traceback.print_exc()
\""

echo ""
echo "✅ Tests complete. Check output above for errors."

