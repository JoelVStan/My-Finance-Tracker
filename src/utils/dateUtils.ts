/**
 * Utility functions for parsing, formatting, and sorting dates.
 * Standard format throughout app & Google Sheets: DD-MM-YYYY (e.g. 15-01-2026)
 */

export interface ParsedDateParts {
  day: number;
  month: number; // 1-12
  year: number;
}

/**
 * Parses any common date string (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
 * into numeric day, month (1-12), and year.
 */
export function parseDateParts(raw: string | number | undefined | null): ParsedDateParts | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Handle Excel serial date number (e.g. 46023)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel epoch begins Dec 30, 1899
    const utcDays = serial - 25569;
    const date = new Date(utcDays * 86400 * 1000);
    return {
      day: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
    };
  }

  // Check DD-MM-YYYY or DD/MM/YYYY (Day 1-31, Month 1-12, Year 4 digits)
  // e.g. 15-01-2026 or 07-01-2026 or 5/1/2026
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    // Standard DD-MM-YYYY: p1 is day, p2 is month
    // If p2 > 12 and p1 <= 12, user might have entered MM-DD-YYYY by mistake, handle gracefully
    if (p2 > 12 && p1 <= 12) {
      return { day: p2, month: p1, year };
    }
    return { day: p1, month: p2, year };
  }

  // Check YYYY-MM-DD or YYYY/MM/DD (HTML input type="date")
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    return { day, month, year };
  }

  // Check 2-digit year DD-MM-YY
  const dmyShortMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const day = parseInt(dmyShortMatch[1], 10);
    const month = parseInt(dmyShortMatch[2], 10);
    const yr = parseInt(dmyShortMatch[3], 10);
    const year = yr < 70 ? 2000 + yr : 1900 + yr;
    return { day, month, year };
  }

  // Fallback to Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      day: parsed.getDate(),
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    };
  }

  return null;
}

/**
 * Returns a valid JavaScript Date object from any date string
 */
export function parseDate(raw: string | undefined | null): Date {
  const parts = parseDateParts(raw);
  if (!parts) {
    return new Date();
  }
  return new Date(parts.year, parts.month - 1, parts.day);
}

/**
 * Returns numeric timestamp (ms) for reliable sorting.
 * Higher timestamp = more recent date.
 */
export function getDateTimestamp(raw: string | undefined | null): number {
  const parts = parseDateParts(raw);
  if (!parts) return 0;
  return new Date(parts.year, parts.month - 1, parts.day).getTime();
}

/**
 * Formats any date into strict DD-MM-YYYY format (e.g. 15-01-2026)
 */
export function formatToDDMMYYYY(raw: string | Date | undefined | null): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    const day = String(raw.getDate()).padStart(2, '0');
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const year = raw.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const parts = parseDateParts(raw);
  if (!parts) return String(raw);

  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  const year = String(parts.year);
  return `${day}-${month}-${year}`;
}

/**
 * Converts DD-MM-YYYY to YYYY-MM-DD for HTML <input type="date" />
 */
export function toInputDateFormat(raw: string | undefined | null): string {
  const parts = parseDateParts(raw);
  if (!parts) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts YYYY-MM-DD (from <input type="date">) to DD-MM-YYYY
 */
export function fromInputDateFormat(inputVal: string): string {
  const parts = parseDateParts(inputVal);
  if (!parts) return inputVal;
  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  const year = String(parts.year);
  return `${day}-${month}-${year}`;
}

/**
 * Returns a month key in "YYYY-MM" format for monthly groupings.
 * e.g. "15-01-2026" => "2026-01"
 */
export function getYearMonthKey(raw: string | undefined | null): string {
  const parts = parseDateParts(raw);
  if (!parts) return '';
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns a readable month label, e.g. "January 2026" or "Jan 2026"
 */
export function formatMonthLabel(yearMonthKey: string, short = false): string {
  const [y, m] = yearMonthKey.split('-');
  if (!y || !m) return yearMonthKey;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleString('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}
