# Fix Database Schema - Missing institution_id Column

## Problem
The `profiles` table is missing the `institution_id` column that the Profile model expects.

## Solution

### Step 1: Add the missing column

Run this command to add the column:

```bash
ssh root@72.60.101.14 'docker exec -i elevate_edu_api python << PYTHON
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='institution_id'
    """))
    
    if result.fetchone():
        print("✅ Column institution_id already exists")
    else:
        # Add the column
        conn.execute(text("ALTER TABLE profiles ADD COLUMN institution_id INTEGER"))
        conn.commit()
        print("✅ Successfully added institution_id column")
PYTHON
'
```

### Step 2: Restart the backend

```bash
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart backend'
```

### Step 3: Test login

Try logging in again. The 500 error should be fixed.

## Alternative: Use the script

```bash
./fix-db.sh
```
