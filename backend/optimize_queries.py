"""Script to optimize database queries for scalability"""
from sqlalchemy import text
from app.core.database import engine

def optimize_database():
    """Apply database optimizations for 10k+ users"""
    print("Optimizing database for scalability...")
    
    optimizations = []
    
    # SQLite optimizations
    if "sqlite" in str(engine.url).lower():
        optimizations = [
            "PRAGMA journal_mode = WAL;",  # Write-Ahead Logging for better concurrency
            "PRAGMA synchronous = NORMAL;",  # Balance between safety and performance
            "PRAGMA cache_size = -64000;",  # 64MB cache
            "PRAGMA temp_store = MEMORY;",  # Store temp tables in memory
            "PRAGMA mmap_size = 268435456;",  # 256MB memory-mapped I/O
        ]
    # MySQL optimizations
    elif "mysql" in str(engine.url).lower() or "pymysql" in str(engine.url).lower():
        optimizations = [
            "SET SESSION query_cache_type = ON;",
            "SET SESSION query_cache_size = 67108864;",  # 64MB query cache
        ]
    # PostgreSQL optimizations
    elif "postgresql" in str(engine.url).lower() or "postgres" in str(engine.url).lower():
        optimizations = [
            "SET work_mem = '256MB';",  # Increase work memory for sorting/hashing
            "SET shared_buffers = '256MB';",  # Increase shared buffers
        ]
    
    with engine.connect() as conn:
        for opt in optimizations:
            try:
                conn.execute(text(opt))
                conn.commit()
                print(f"✅ Applied: {opt}")
            except Exception as e:
                print(f"⚠️  Could not apply {opt}: {e}")
    
    print("✅ Database optimizations applied!")

if __name__ == "__main__":
    optimize_database()

