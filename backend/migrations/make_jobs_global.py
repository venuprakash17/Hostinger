"""Migration: Make jobs global (available to all students)
- Make college_id nullable (jobs available to all colleges)
- Set default college_id to NULL for existing jobs (or keep first college)

To run this migration manually:
ALTER TABLE jobs ALTER COLUMN college_id DROP NOT NULL;
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

def upgrade():
    """Make jobs global by making college_id nullable"""
    # Note: This migration should be run manually via SQL:
    # ALTER TABLE jobs ALTER COLUMN college_id DROP NOT NULL;
    print("⚠️  Please run this SQL manually:")
    print("ALTER TABLE jobs ALTER COLUMN college_id DROP NOT NULL;")
    print("✅ Model already updated - college_id is now nullable")
    print("\nThe backend model has been updated. Run the SQL above in your database to complete the migration.")

if __name__ == "__main__":
    upgrade()
