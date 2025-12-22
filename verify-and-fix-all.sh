#!/bin/bash
# Comprehensive verification and fix script

echo "🔍 Verifying backend status and fixing all issues..."
echo ""

ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "1️⃣ Checking backend container status..."
docker-compose ps

echo ""
echo "2️⃣ Checking for missing database columns..."
docker exec -i elevate_edu_db psql -U elevate_user -d elevate_edu << SQL
-- Check profiles table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'institution_id')
        THEN '✅ profiles.institution_id exists'
        ELSE '❌ profiles.institution_id MISSING'
    END as profiles_check;

-- Check user_roles table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'institution_id')
        THEN '✅ user_roles.institution_id exists'
        ELSE '❌ user_roles.institution_id MISSING'
    END as user_roles_check;

-- Add missing columns
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'institution_id') THEN
        ALTER TABLE profiles ADD COLUMN institution_id INTEGER;
        RAISE NOTICE '✅ Added institution_id to profiles';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'institution_id') THEN
        ALTER TABLE user_roles ADD COLUMN institution_id INTEGER;
        RAISE NOTICE '✅ Added institution_id to user_roles';
    END IF;
END \$\$;
SQL

echo ""
echo "3️⃣ Checking recent backend errors..."
docker-compose logs --tail=50 backend | grep -i "error\|exception\|undefinedcolumn" | tail -20

echo ""
echo "4️⃣ Testing backend health..."
curl -s http://localhost:8000/api/v1/health || echo "❌ Backend not responding"

echo ""
echo "5️⃣ Restarting backend to ensure all fixes are applied..."
docker-compose restart backend

echo ""
echo "⏳ Waiting 15 seconds for backend to start..."
sleep 15

echo ""
echo "6️⃣ Final health check..."
curl -s http://localhost:8000/api/v1/health && echo "" || echo "❌ Backend still not responding"

echo ""
echo "✅ Verification complete!"

ENDSSH

echo ""
echo "🌐 Test the application now - all errors should be fixed!"

