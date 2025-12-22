"""Database utility functions for safe queries and error handling"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, InternalError
from sqlalchemy import text, inspect
from typing import Callable, TypeVar, Optional, Any
import logging
import traceback
import sys

logger = logging.getLogger(__name__)

T = TypeVar('T')


def safe_query(
    db: Session,
    query_func: Callable[[], T],
    fallback_value: T = None,
    error_message: str = "Database query failed"
) -> T:
    """
    Safely execute a database query with error handling.
    
    Args:
        db: Database session
        query_func: Function that returns the query result
        fallback_value: Value to return if query fails (default: None)
        error_message: Custom error message for logging
    
    Returns:
        Query result or fallback_value if query fails
    """
    try:
        return query_func()
    except (ProgrammingError, InternalError) as e:
        error_str = str(e).lower()
        if "undefinedcolumn" in error_str or ("column" in error_str and "does not exist" in error_str):
            logger.error(f"{error_message}: Column missing - {e}")
            print(f"[SAFE_QUERY] Column error: {e}", file=sys.stderr)
            sys.stderr.flush()
            return fallback_value
        else:
            logger.error(f"{error_message}: {e}")
            logger.error(traceback.format_exc())
            print(f"[SAFE_QUERY] Database error: {e}", file=sys.stderr)
            sys.stderr.flush()
            return fallback_value
    except Exception as e:
        logger.error(f"{error_message}: Unexpected error - {e}")
        logger.error(traceback.format_exc())
        print(f"[SAFE_QUERY] Unexpected error: {e}", file=sys.stderr)
        sys.stderr.flush()
        return fallback_value


def ensure_column_exists(
    engine,
    table_name: str,
    column_name: str,
    column_type: str = "VARCHAR(255)"
) -> bool:
    """
    Ensure a column exists in a table. Add it if missing.
    
    Args:
        engine: SQLAlchemy engine
        table_name: Name of the table
        column_name: Name of the column to check/add
        column_type: SQL type for the column (default: VARCHAR(255))
    
    Returns:
        True if column exists or was added, False otherwise
    """
    try:
        inspector = inspect(engine)
        if table_name not in inspector.get_table_names():
            return False
        
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        if column_name in columns:
            return True
        
        # Column doesn't exist, add it
        print(f"[MIGRATION] Adding {column_name} column to {table_name}...", file=sys.stderr)
        sys.stderr.flush()
        
        conn = engine.connect()
        trans = conn.begin()
        try:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
            trans.commit()
            print(f"[MIGRATION] ✅ Added {column_name} column to {table_name}", file=sys.stderr)
            sys.stderr.flush()
            return True
        except Exception as add_error:
            trans.rollback()
            error_msg = str(add_error).lower()
            if "already exists" not in error_msg and "duplicate" not in error_msg:
                print(f"[MIGRATION] ⚠️  Error adding {column_name}: {add_error}", file=sys.stderr)
                sys.stderr.flush()
                return False
            else:
                # Column was added by another process
                return True
        finally:
            conn.close()
    except Exception as e:
        print(f"[MIGRATION] ⚠️  Error checking/adding column: {e}", file=sys.stderr)
        sys.stderr.flush()
        return False


def safe_list_query(
    db: Session,
    query,
    fallback_empty: bool = True
) -> list:
    """
    Safely execute a list query with error handling.
    
    Args:
        db: Database session
        query: SQLAlchemy query object
        fallback_empty: If True, return empty list on error; if False, raise exception
    
    Returns:
        List of results or empty list if fallback_empty=True
    """
    try:
        return query.all()
    except (ProgrammingError, InternalError) as e:
        error_str = str(e).lower()
        if "undefinedcolumn" in error_str or ("column" in error_str and "does not exist" in error_str):
            logger.error(f"Column missing error in query: {e}")
            print(f"[SAFE_LIST_QUERY] Column error: {e}", file=sys.stderr)
            sys.stderr.flush()
            if fallback_empty:
                return []
            raise
        else:
            logger.error(f"Database error in query: {e}")
            logger.error(traceback.format_exc())
            if fallback_empty:
                return []
            raise
    except Exception as e:
        logger.error(f"Unexpected error in query: {e}")
        logger.error(traceback.format_exc())
        if fallback_empty:
            return []
        raise

