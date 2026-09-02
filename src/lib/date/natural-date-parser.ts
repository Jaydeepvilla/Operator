/**
 * Production-Grade Natural-Language Date/Time Parser
 *
 * Deterministically parses natural-language date/time strings with:
 * - Strict calendar validation (no silent normalization of Feb 30, Apr 31, 32 Aug, etc.)
 * - Explicit reference date (`now`)
 * - Explicit timezone conversion
 * - Separation of date-only vs datetime vs daypart
 * - Explicit rejection of unsupported or ambiguous expressions
 */

export type DatePrecision = "date" | "datetime" | "daypart";
export type DayPart = "morning" | "afternoon" | "evening" | "night";

export type DateParseErrorCode =
  | "UNSUPPORTED"
  | "AMBIGUOUS"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "MISSING_TIME"
  | "PAST_DATE"
  | "OUT_OF_RANGE";

export interface DateParseSuccess {
  success: true;
  date: Date;
  isoDate: string; // YYYY-MM-DD
  isoTime?: string; // HH:mm (24-hour)
  timezone: string;
  confidence: "high" | "medium";
  interpretation: string;
  precision: DatePrecision;
  daypart?: DayPart;
  isFuture: boolean;
}

export interface DateParseFailure {
  success: false;
  reason: string;
  code: DateParseErrorCode;
  suggestedClarification?: string;
}

export type DateParseResult = DateParseSuccess | DateParseFailure;

export interface DateParseContext {
  now?: Date;
  referenceDate?: Date;
  timezone?: string;
  locale?: string;
  defaultTime?: string; // e.g. "09:00" if required
}

// -------------------------------------------------------------
// Calendar Helper Utilities
// -------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1970 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

/**
 * Creates a UTC Date representing a specific YYYY-MM-DD HH:mm:ss in a given timezone.
 */
export function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
  timezone: string = "UTC"
): Date {
  if (timezone.toUpperCase() === "UTC" || timezone.toUpperCase() === "GMT") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  try {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const utcInitial = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcInitial);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);

    const tzYear = getPart("year");
    const tzMonth = getPart("month");
    const tzDay = getPart("day");
    let tzHour = getPart("hour");
    if (tzHour === 24) tzHour = 0;
    const tzMin = getPart("minute");
    const tzSec = getPart("second");

    const tzTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec);
    const offset = tzTime - utcInitial.getTime();

    return new Date(utcInitial.getTime() - offset);
  } catch {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }
}

/**
 * Extracts year, month, day, weekday in the reference timezone.
 */
function getNowPartsInTimezone(now: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);
    const weekdayStr = parts.find(p => p.type === "weekday")?.value?.toLowerCase() || "sun";

    const weekdayMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    };

    let hour = getPart("hour");
    if (hour === 24) hour = 0;

    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
      weekday: weekdayMap[weekdayStr] ?? now.getUTCDay(),
      hour,
      minute: getPart("minute"),
    };
  } catch {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      weekday: now.getUTCDay(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
}

// -------------------------------------------------------------
// Vague / Unsupported Expressions
// -------------------------------------------------------------

const UNSUPPORTED_PATTERNS = [
  /\b(sometime|some\s*time)\s*(later|soon|next\s*week|next\s*month|this\s*week)?\b/i,
  /\bone\s*of\s*these\s*days\b/i,
  /\baround\s*(next\s*week|next\s*month|then|soon)\b/i,
  /\b(soon|whenever|a\s*while\s*from\s*now|the\s*other\s*day|after\s*some\s*time)\b/i,
  /\b(maybe|probably|possibly)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
];

// -------------------------------------------------------------
// Main Natural Date Parser
// -------------------------------------------------------------

export function parseNaturalDateTime(
  rawInput: string,
  context: DateParseContext = {}
): DateParseResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      success: false,
      code: "INVALID_DATE",
      reason: "Input string is empty or invalid.",
    };
  }

  const trimmed = rawInput.trim();
  const lower = trimmed.toLowerCase();
  const timezone = context.timezone || "UTC";
  const now = context.referenceDate || context.now || new Date();
  const nowParts = getNowPartsInTimezone(now, timezone);

  // 1. Check for explicit unsupported/vague expressions
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        success: false,
        code: "UNSUPPORTED",
        reason: `Expression "${trimmed}" is too vague. Please provide a specific date and time.`,
        suggestedClarification: "Could you please specify an exact date (e.g. 'tomorrow', 'next Friday', or 'August 20')?",
      };
    }
  }

  // 2. Extract Time Component (if present)
  let extractedHour: number | null = null;
  let extractedMinute: number | null = null;
  let daypart: DayPart | undefined;
  let textWithoutTime = lower;

  // Daypart matching: "tomorrow morning", "this afternoon", "next Friday evening"
  const daypartMatch = textWithoutTime.match(/\b(morning|afternoon|evening|night|tonight)\b/);
  if (daypartMatch) {
    const dp = daypartMatch[1].toLowerCase();
    if (dp === "tonight") {
      daypart = "night";
    } else {
      daypart = dp as DayPart;
    }
    textWithoutTime = textWithoutTime.replace(/\b(morning|afternoon|evening|night|tonight)\b/, "").trim();
  }

  // Safe time matching:
  // Pattern A: "14:00", "at 3:30 pm", "10:15 am"
  const colonTimeMatch = textWithoutTime.match(/(?:at\s+)?\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/i);
  // Pattern B: "3pm", "at 4 PM"
  const meridianTimeMatch = textWithoutTime.match(/(?:at\s+)?\b(\d{1,2})\s*(am|pm)\b/i);
  // Pattern C: "at 4", "at 14"
  const atTimeMatch = textWithoutTime.match(/\bat\s+(\d{1,2})\b/i);

  if (colonTimeMatch) {
    const rawH = parseInt(colonTimeMatch[1], 10);
    const rawM = parseInt(colonTimeMatch[2], 10);
    const meridian = colonTimeMatch[3]?.toLowerCase();

    if (rawM < 0 || rawM > 59) {
      return { success: false, code: "INVALID_TIME", reason: `Invalid minute "${rawM}" in time.` };
    }

    if (meridian) {
      if (rawH < 1 || rawH > 12) {
        return { success: false, code: "INVALID_TIME", reason: `Invalid hour "${rawH}" for AM/PM format.` };
      }
      extractedHour = meridian === "pm" ? (rawH === 12 ? 12 : rawH + 12) : (rawH === 12 ? 0 : rawH);
    } else {
      if (rawH < 0 || rawH > 23) {
        return { success: false, code: "INVALID_TIME", reason: `Invalid hour "${rawH}" for 24-hour format.` };
      }
      extractedHour = rawH;
    }
    extractedMinute = rawM;
    textWithoutTime = textWithoutTime.replace(colonTimeMatch[0], "").trim();
  } else if (meridianTimeMatch) {
    const rawH = parseInt(meridianTimeMatch[1], 10);
    const meridian = meridianTimeMatch[2].toLowerCase();

    if (rawH < 1 || rawH > 12) {
      return { success: false, code: "INVALID_TIME", reason: `Invalid hour "${rawH}" for AM/PM format.` };
    }
    extractedHour = meridian === "pm" ? (rawH === 12 ? 12 : rawH + 12) : (rawH === 12 ? 0 : rawH);
    extractedMinute = 0;
    textWithoutTime = textWithoutTime.replace(meridianTimeMatch[0], "").trim();
  } else if (atTimeMatch) {
    const rawH = parseInt(atTimeMatch[1], 10);
    if (rawH < 0 || rawH > 23) {
      return { success: false, code: "INVALID_TIME", reason: `Invalid hour "${rawH}".` };
    }
    // If hour between 1 and 6, assume afternoon PM
    extractedHour = (rawH >= 1 && rawH <= 6) ? rawH + 12 : rawH;
    extractedMinute = 0;
    textWithoutTime = textWithoutTime.replace(atTimeMatch[0], "").trim();
  }

  // Clean remaining text
  textWithoutTime = textWithoutTime
    .replace(/\b(on|for|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let targetYear = nowParts.year;
  let targetMonth = nowParts.month;
  let targetDay = nowParts.day;
  let confidence: "high" | "medium" = "high";
  let interpretationDescription = "";

  // 3. Parse Date Expression
  let dateMatched = false;

  // A. "today"
  if (textWithoutTime === "today" || (textWithoutTime === "" && (extractedHour !== null || daypart !== undefined))) {
    targetYear = nowParts.year;
    targetMonth = nowParts.month;
    targetDay = nowParts.day;
    interpretationDescription = "Today";
    dateMatched = true;
  }
  // B. "tomorrow"
  else if (textWithoutTime === "tomorrow") {
    const nextDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 1));
    targetYear = nextDate.getUTCFullYear();
    targetMonth = nextDate.getUTCMonth() + 1;
    targetDay = nextDate.getUTCDate();
    interpretationDescription = "Tomorrow";
    dateMatched = true;
  }
  // C. "day after tomorrow"
  else if (textWithoutTime === "day after tomorrow") {
    const nextDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 2));
    targetYear = nextDate.getUTCFullYear();
    targetMonth = nextDate.getUTCMonth() + 1;
    targetDay = nextDate.getUTCDate();
    interpretationDescription = "Day after tomorrow";
    dateMatched = true;
  }
  // D. "yesterday"
  else if (textWithoutTime === "yesterday") {
    const prevDate = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day - 1));
    targetYear = prevDate.getUTCFullYear();
    targetMonth = prevDate.getUTCMonth() + 1;
    targetDay = prevDate.getUTCDate();
    interpretationDescription = "Yesterday";
    dateMatched = true;
  }
  // E. "in X days" or "X days from now"
  else if (/^in\s+(\d+)\s+days?$/.test(textWithoutTime) || /^(\d+)\s+days?\s+from\s+now$/.test(textWithoutTime)) {
    const days = parseInt(textWithoutTime.replace(/\D/g, ""), 10);
    const target = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + days));
    targetYear = target.getUTCFullYear();
    targetMonth = target.getUTCMonth() + 1;
    targetDay = target.getUTCDate();
    interpretationDescription = `In ${days} days`;
    dateMatched = true;
  }
  // F. "in X weeks" or "X weeks from now"
  else if (/^in\s+(\d+)\s+weeks?$/.test(textWithoutTime) || /^(\d+)\s+weeks?\s+from\s+now$/.test(textWithoutTime)) {
    const weeks = parseInt(textWithoutTime.replace(/\D/g, ""), 10);
    const target = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + weeks * 7));
    targetYear = target.getUTCFullYear();
    targetMonth = target.getUTCMonth() + 1;
    targetDay = target.getUTCDate();
    interpretationDescription = `In ${weeks} weeks`;
    dateMatched = true;
  }
  // G. "in X months" or "X months from now"
  else if (/^in\s+(\d+)\s+months?$/.test(textWithoutTime) || /^(\d+)\s+months?\s+from\s+now$/.test(textWithoutTime)) {
    const months = parseInt(textWithoutTime.replace(/\D/g, ""), 10);
    let newM = nowParts.month + months;
    let newY = nowParts.year;
    while (newM > 12) {
      newM -= 12;
      newY += 1;
    }
    const maxDays = getDaysInMonth(newY, newM);
    targetYear = newY;
    targetMonth = newM;
    targetDay = Math.min(nowParts.day, maxDays);
    interpretationDescription = `In ${months} months`;
    dateMatched = true;
  }
  // H. "this week" / "next week"
  else if (textWithoutTime === "this week") {
    targetYear = nowParts.year;
    targetMonth = nowParts.month;
    targetDay = nowParts.day;
    interpretationDescription = "This week";
    dateMatched = true;
  }
  else if (textWithoutTime === "next week") {
    const target = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 7));
    targetYear = target.getUTCFullYear();
    targetMonth = target.getUTCMonth() + 1;
    targetDay = target.getUTCDate();
    interpretationDescription = "Next week";
    dateMatched = true;
  }
  // I. Weekdays: "this Friday", "next Monday", "last Tuesday", "Friday"
  else if (/^(this|next|last)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)$/.test(textWithoutTime)) {
    const match = textWithoutTime.match(/^(this|next|last)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)$/);
    if (match) {
      const modifier = match[1]?.toLowerCase();
      const weekdayStr = match[2]?.toLowerCase();
      const targetWeekday = WEEKDAY_NAMES[weekdayStr];

      if (targetWeekday !== undefined) {
        const currentWeekday = nowParts.weekday;
        let dayDiff = 0;

        if (modifier === "this") {
          dayDiff = targetWeekday - currentWeekday;
          if (dayDiff < 0) dayDiff += 7;
        } else if (modifier === "next") {
          dayDiff = targetWeekday - currentWeekday + 7;
        } else if (modifier === "last") {
          dayDiff = targetWeekday >= currentWeekday ? (targetWeekday - currentWeekday - 7) : (targetWeekday - currentWeekday);
        } else {
          // Plain weekday (e.g. "Friday") -> next upcoming occurrence (1..7 days ahead)
          dayDiff = (targetWeekday - currentWeekday + 7) % 7;
          if (dayDiff === 0) dayDiff = 7;
        }

        const target = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + dayDiff));
        targetYear = target.getUTCFullYear();
        targetMonth = target.getUTCMonth() + 1;
        targetDay = target.getUTCDate();
        interpretationDescription = `${modifier ? modifier + " " : ""}${weekdayStr}`;
        dateMatched = true;
      }
    }
  }
  // J. Explicit Named Month Dates: "August 20, 2026", "20th August 2026", "August 20"
  else if (
    /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)/i.test(textWithoutTime)
  ) {
    const monthFirstMatch = textWithoutTime.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i);
    const dayFirstMatch = textWithoutTime.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)(?:,?\s+(\d{4}))?$/i);

    let mStr = "";
    let dNum = 0;
    let yNum = nowParts.year;

    if (monthFirstMatch && MONTH_NAMES[monthFirstMatch[1].toLowerCase()]) {
      mStr = monthFirstMatch[1].toLowerCase();
      dNum = parseInt(monthFirstMatch[2], 10);
      if (monthFirstMatch[3]) yNum = parseInt(monthFirstMatch[3], 10);
    } else if (dayFirstMatch && MONTH_NAMES[dayFirstMatch[2].toLowerCase()]) {
      mStr = dayFirstMatch[2].toLowerCase();
      dNum = parseInt(dayFirstMatch[1], 10);
      if (dayFirstMatch[3]) yNum = parseInt(dayFirstMatch[3], 10);
    }

    if (mStr && dNum > 0) {
      const monthNum = MONTH_NAMES[mStr];
      if (!isValidCalendarDate(yNum, monthNum, dNum)) {
        return {
          success: false,
          code: "INVALID_DATE",
          reason: `Invalid calendar date: "${mStr} ${dNum}, ${yNum}" does not exist.`,
        };
      }

      targetYear = yNum;
      targetMonth = monthNum;
      targetDay = dNum;
      interpretationDescription = `${mStr} ${dNum}, ${yNum}`;
      dateMatched = true;
    } else {
      return {
        success: false,
        code: "INVALID_DATE",
        reason: `Could not parse date "${textWithoutTime}".`,
      };
    }
  }
  // K. Numeric Date: "2026-08-20", "2026/08/20" (ISO / Standard)
  else if (/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.test(textWithoutTime)) {
    const parts = textWithoutTime.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (parts) {
      const y = parseInt(parts[1], 10);
      const m = parseInt(parts[2], 10);
      const d = parseInt(parts[3], 10);

      if (!isValidCalendarDate(y, m, d)) {
        return {
          success: false,
          code: "INVALID_DATE",
          reason: `Invalid ISO date: ${textWithoutTime}.`,
        };
      }

      targetYear = y;
      targetMonth = m;
      targetDay = d;
      interpretationDescription = `${y}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      dateMatched = true;
    }
  }
  // L. Ambiguous / Slash Dates: "03/04/2026" or "03-04-2026"
  else if (/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/.test(textWithoutTime)) {
    const parts = textWithoutTime.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
    if (parts) {
      const n1 = parseInt(parts[1], 10);
      const n2 = parseInt(parts[2], 10);
      let y = parts[3] ? parseInt(parts[3], 10) : nowParts.year;
      if (y < 100) y += 2000;

      if (n1 <= 12 && n2 <= 12 && n1 !== n2) {
        const isUSLocale = (context.locale || "").toLowerCase().includes("en-us") || (context.locale || "").toLowerCase() === "us";
        if (!context.locale) {
          return {
            success: false,
            code: "AMBIGUOUS",
            reason: `Date "${textWithoutTime}" is ambiguous between Day-Month and Month-Day.`,
            suggestedClarification: `Did you mean ${n1} ${Object.keys(MONTH_NAMES)[(n2 - 1) * 2]} or ${n2} ${Object.keys(MONTH_NAMES)[(n1 - 1) * 2]}?`,
          };
        }

        if (isUSLocale) {
          targetMonth = n1;
          targetDay = n2;
        } else {
          targetDay = n1;
          targetMonth = n2;
        }
      } else if (n1 > 12 && n2 <= 12) {
        targetDay = n1;
        targetMonth = n2;
      } else if (n1 <= 12 && n2 > 12) {
        targetMonth = n1;
        targetDay = n2;
      } else {
        return {
          success: false,
          code: "INVALID_DATE",
          reason: `Invalid calendar date in "${textWithoutTime}".`,
        };
      }

      targetYear = y;
      if (!isValidCalendarDate(targetYear, targetMonth, targetDay)) {
        return {
          success: false,
          code: "INVALID_DATE",
          reason: `Calendar date does not exist: ${targetYear}-${targetMonth}-${targetDay}.`,
        };
      }
      interpretationDescription = `${targetYear}-${targetMonth.toString().padStart(2, "0")}-${targetDay.toString().padStart(2, "0")}`;
      dateMatched = true;
    }
  }

  if (!dateMatched) {
    return {
      success: false,
      code: "UNSUPPORTED",
      reason: `Could not parse date expression "${trimmed}".`,
      suggestedClarification: "Please provide a recognizable date format such as 'tomorrow', 'next Friday', or 'August 20'.",
    };
  }

  // 4. Construct Final Date
  const finalHour = extractedHour !== null ? extractedHour : 0;
  const finalMinute = extractedMinute !== null ? extractedMinute : 0;

  const finalDate = createDateInTimezone(
    targetYear,
    targetMonth,
    targetDay,
    finalHour,
    finalMinute,
    0,
    timezone
  );

  const pad = (n: number) => n.toString().padStart(2, "0");
  const isoDate = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
  const isoTime = extractedHour !== null ? `${pad(finalHour)}:${pad(finalMinute)}` : undefined;

  const precision: DatePrecision = extractedHour !== null ? "datetime" : daypart ? "daypart" : "date";
  const isFuture = finalDate.getTime() >= now.getTime();

  return {
    success: true,
    date: finalDate,
    isoDate,
    isoTime,
    timezone,
    confidence,
    interpretation: `${interpretationDescription}${isoTime ? ` at ${isoTime}` : ""}${daypart ? ` (${daypart})` : ""}`,
    precision,
    daypart,
    isFuture,
  };
}
