"""Year formatting utilities for consistent year handling"""
from typing import Optional


def format_year(year: Optional[str]) -> Optional[str]:
    """Convert numeric year to formatted year (e.g., "1" -> "1st", "2" -> "2nd")
    
    Args:
        year: Year as string (e.g., "1", "2", "3", "4", "5") or already formatted
        
    Returns:
        Formatted year string (e.g., "1st", "2nd", "3rd", "4th", "5th") or None
    """
    if not year:
        return None
    
    year = str(year).strip()
    
    # If already formatted, return as is
    if year.endswith(('st', 'nd', 'rd', 'th')):
        return year
    
    # Convert numeric to formatted
    try:
        num = int(year)
        if num == 1:
            return "1st"
        elif num == 2:
            return "2nd"
        elif num == 3:
            return "3rd"
        elif num == 4:
            return "4th"
        elif num == 5:
            return "5th"
        else:
            # For any other number, use generic format
            return f"{num}th"
    except (ValueError, TypeError):
        # If not a number and not formatted, return as is
        return year


def parse_year(year: Optional[str]) -> Optional[str]:
    """Convert formatted year to numeric (e.g., "1st" -> "1", "2nd" -> "2")
    
    Args:
        year: Formatted year string (e.g., "1st", "2nd", "3rd", "4th", "5th") or numeric
        
    Returns:
        Numeric year string (e.g., "1", "2", "3", "4", "5") or None
    """
    if not year:
        return None
    
    year = str(year).strip()
    
    # If already numeric, convert to int and return as string (handles "3.0" -> "3")
    try:
        num = float(year)
        return str(int(num))
    except ValueError:
        pass
    
    # Extract number from formatted string
    if year.endswith('st'):
        return year[:-2]
    elif year.endswith('nd'):
        return year[:-2]
    elif year.endswith('rd'):
        return year[:-2]
    elif year.endswith('th'):
        return year[:-2]
    else:
        # If can't parse, try to extract first number
        import re
        match = re.search(r'\d+', year)
        if match:
            return match.group()
        return year


def get_next_year(current_year: Optional[str]) -> str:
    """Get next year from current year (returns numeric format for backend storage)
    
    Args:
        current_year: Current year in any format ("1", "1st", "2", "2nd", etc.)
        
    Returns:
        Next year as numeric string ("1", "2", "3", "4", "5") for backend storage
    """
    if not current_year:
        return "1"
    
    # Normalize to numeric first
    numeric = parse_year(current_year)
    if not numeric:
        return "1"
    
    try:
        num = int(numeric)
        if num == 1:
            return "2"
        elif num == 2:
            return "3"
        elif num == 3:
            return "4"
        elif num == 4:
            return "5"
        elif num >= 5:
            return "5"  # Stay at 5 if already 5 or higher
        else:
            return "1"  # Default to 1 for invalid years
    except (ValueError, TypeError):
        return "1"

