const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return new Date(`${value}T00:00:00`);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWorkday(date: Date, holidays: Set<string>): boolean {
  return !isWeekend(date) && !holidays.has(formatIsoDate(date));
}

export function adjustToWorkday(
  date: Date,
  direction: "forward" | "backward",
  holidays: Set<string>
): Date {
  let cursor = new Date(date);
  while (!isWorkday(cursor, holidays)) {
    cursor = addDays(cursor, direction === "forward" ? 1 : -1);
  }
  return cursor;
}

export function workdaysBetween(start: Date, end: Date, holidays: Set<string>): number {
  if (end < start) {
    return 0;
  }

  let count = 0;
  let cursor = addDays(start, 1);
  while (cursor <= end) {
    if (isWorkday(cursor, holidays)) {
      count += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function diffCalendarDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

export function formatNlDate(value: string): string {
  const date = parseIsoDate(value);
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
