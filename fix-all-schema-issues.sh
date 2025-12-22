#!/bin/bash
# Comprehensive database schema fix

echo "🔧 Fixing all database schema issues..."
echo ""

ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "Adding all missing columns..."

docker exec -i elevate_edu_db psql -U elevate_user -d elevate_edu << SQL
-- Fix profiles table
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN institution_id INTEGER;
        RAISE NOTICE '✅ Added institution_id to profiles';
    END IF;
END \$\$;

-- Fix user_roles table
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN institution_id INTEGER;
        RAISE NOTICE '✅ Added institution_id to user_roles';
    END IF;
END \$\$;

-- Fix users table (if needed)
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE users ADD COLUMN institution_id INTEGER;
        RAISE NOTICE '✅ Added institution_id to users';
    END IF;
END \$\$;

RAISE NOTICE '✅ Schema check complete!';
SQL

echo ""
echo "🔄 Restarting backend..."
docker-compose restart backend

echo ""
echo "⏳ Waiting 10 seconds for backend to start..."
sleep 10

echo ""
echo "✅ Done! Check if errors are fixed."

ENDSSH

