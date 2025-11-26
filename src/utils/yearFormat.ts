/**
 * Year formatting utilities for consistent year display
 * Backend stores years as numeric strings ("1", "2", "3", "4", "5")
 * Frontend displays them as formatted strings ("1st", "2nd", "3rd", "4th", "5th")
 */

export function formatYear(year: string | null | undefined): string {
  if (!year) return "N/A";
  
  const yearStr = String(year).trim();
  
  // If already formatted, return as is
  if (yearStr.endsWith('st') || yearStr.endsWith('nd') || yearStr.endsWith('rd') || yearStr.endsWith('th')) {
    return yearStr;
  }
  
  // Convert numeric to formatted
  const num = parseInt(yearStr, 10);
  if (isNaN(num)) return yearStr;
  
  switch (num) {
    case 1: return "1st";
    case 2: return "2nd";
    case 3: return "3rd";
    case 4: return "4th";
    case 5: return "5th";
    default: return `${num}th`;
  }
}

export function parseYear(year: string | null | undefined): string {
  if (!year) return "";
  
  const yearStr = String(year).trim();
  
  // If already numeric, convert float to int (handles "3.0" -> "3")
  const numMatch = yearStr.match(/^(\d+)(?:\.\d+)?$/);
  if (numMatch) {
    return numMatch[1];
  }
  
  // Extract number from formatted string
  if (yearStr.endsWith('st')) {
    return yearStr.slice(0, -2);
  } else if (yearStr.endsWith('nd')) {
    return yearStr.slice(0, -2);
  } else if (yearStr.endsWith('rd')) {
    return yearStr.slice(0, -2);
  } else if (yearStr.endsWith('th')) {
    return yearStr.slice(0, -2);
  }
  
  // Try to extract first number from string
  const numberMatch = yearStr.match(/\d+/);
  if (numberMatch) {
    return numberMatch[0];
  }
  
  return yearStr;
}

export function getYearOptions(): { value: string; label: string }[] {
  return [
    { value: "1", label: "1st Year" },
    { value: "2", label: "2nd Year" },
    { value: "3", label: "3rd Year" },
    { value: "4", label: "4th Year" },
    { value: "5", label: "5th Year" },
  ];
}

