
function hasTimezoneInfo(dateStr: string): boolean {
  return dateStr.includes('Z') || 
         dateStr.includes('+') || 
         Boolean(dateStr.includes('-') && dateStr.match(/[+-]\d{2}:\d{2}$/));
}

export function parseUTCDate(dateValue: Date | string | undefined | null): Date | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  const dateStr = dateValue.toString();
  const parsedDate = hasTimezoneInfo(dateStr)
    ? new Date(dateStr)
    : new Date(dateStr + 'Z');
  
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function getUTCTimestamp(dateValue: Date | string | undefined | null): number {
  const date = parseUTCDate(dateValue);
  return date ? date.getTime() : 0;
}

export function formatRelativeTime(dateValue: Date | string | undefined | null): string {
  const date = parseUTCDate(dateValue);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
  const diffDays = Math.floor(Math.abs(diffMs) / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDate(dateValue: Date | string | undefined | null): string {
  const date = parseUTCDate(dateValue);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatISODate(dateValue: Date | string | undefined | null): string {
  const date = parseUTCDate(dateValue);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function isDateExpired(dateValue: Date | string | undefined | null): boolean {
  if (!dateValue) return false;
  const date = parseUTCDate(dateValue);
  if (!date) return false;
  return new Date() > date;
}

export function minutesSince(dateValue: Date | string | undefined | null): number | null {
  const date = parseUTCDate(dateValue);
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(Math.abs(diffMs) / 60000);
}

