"""Performance optimization utilities"""
from functools import wraps
from time import time
import logging

logger = logging.getLogger(__name__)


def log_query_performance(func):
    """Decorator to log slow queries"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time()
        result = await func(*args, **kwargs)
        duration = time() - start
        if duration > 1.0:  # Log queries taking more than 1 second
            logger.warning(f"Slow query in {func.__name__}: {duration:.2f}s")
        return result
    return wrapper


def optimize_query(query, limit=1000):
    """Apply common optimizations to a query"""
    # Always limit results
    if hasattr(query, 'limit'):
        query = query.limit(limit)
    return query

