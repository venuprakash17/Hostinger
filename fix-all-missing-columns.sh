#!/bin/bash
# Comprehensive script to fix all missing database columns

echo "🔧 Fixing all missing database columns..."
echo ""

ssh root@72.60.101.14 << 'ENDSSH'
cd /root/elevate-edu

echo "Checking and fixing missing columns..."

docker exec -i elevate_edu_db psql -U elevate_user -d elevate_edu << SQL
-- Add institution_id to profiles if missing
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN institution_id INTEGER;
        RAISE NOTICE 'Added institution_id to profiles';
    ELSE
        RAISE NOTICE 'institution_id already exists in profiles';
    END IF;
END \$\$;

-- Check for other common missing columns
-- Add any other missing columns here as needed

SQL

echo ""
echo "✅ Database schema check complete!"
echo ""
echo "Restarting backend..."
docker-compose restart backend

ENDSSH

echo ""
echo "✅ All fixes applied!"

