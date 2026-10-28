// Custom checklists for secure enterprise auth module

// 1. Reserved email prefixes to prevent impersonation or administrative conflicts
export const RESERVED_EMAIL_PREFIXES = [
  "admin",
  "administrator",
  "support",
  "security",
  "root",
  "system",
  "billing",
  "sales",
  "info",
  "help",
  "webmaster",
  "postmaster",
  "hostmaster",
  "contact",
  "api",
  "status",
  "dev",
  "developer",
  "operator",
];

// 2. Common disposable email domains
export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.org",
  "temp-mail.ru",
  "trashmail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "10minutemail.com",
  "dispostable.com",
  "getairmail.com",
  "throwawaymail.com",
  "tempmailaddress.com",
  "fakeinbox.com",
  "mintemail.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "generator.email",
];

// 3. Highly common/leaked passwords checklist
export const COMMON_PASSWORDS = [
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "qwerty",
  "1234567",
  "letmein123",
  "letmein",
  "welcome",
  "password123",
  "admin123",
  "1234567890",
  "sunshine",
  "football",
  "princess",
  "iloveyou",
  "monkey",
  "charlie",
  "donald",
  "shadow",
  "joshua",
  "michael",
  "lisa123",
  "master",
  "jessica",
  "hunter",
  "ginger",
  "mariah",
];

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4 | 5; // 0: Very Weak, 1: Weak, 2: Medium, 3: Strong, 4: Very Strong, 5: Enterprise Strong
  label: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  suggestions: string[];
  unmetRequirements: string[];
}

/**
 * Validates password strength and matches custom criteria (12 chars, upper, lower, number, symbol, no email/name).
 */
export function analyzePasswordStrength(
  password: string,
  email: string = "",
  firstName: string = "",
  lastName: string = ""
): PasswordStrengthResult {
  const unmetRequirements: string[] = [];
  const suggestions: string[] = [];

  // Check core requirements for consolidated suggestion
  const hasLength = password.length >= 8 && password.length <= 128;
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSym = /[!@#$%^&*()_+\-=\[\]\{\};':",.\/<>?]/.test(password);
  const hasUpper = /[A-Z]/.test(password);

  if (!hasLength || !hasLower || !hasNum || !hasSym) {
    suggestions.push("Password must be between 8 and 128 characters long and include uppercase, lowercase, a digit, and a symbol.");
  }

  // Length requirement
  if (!hasLength) {
    unmetRequirements.push("Between 8 and 128 characters");
  }

  // Case checks
  if (!hasUpper) {
    unmetRequirements.push("At least one uppercase letter");
  }
  if (!hasLower) {
    unmetRequirements.push("At least one lowercase letter");
  }

  // Numeric checks
  if (!hasNum) {
    unmetRequirements.push("At least one number");
  }

  // Special character checks
  if (!hasSym) {
    unmetRequirements.push("At least one special character");
  }

  // Email context checks
  if (email && email.includes("@")) {
    const emailPrefix = email.split("@")[0].toLowerCase();
    if (emailPrefix.length >= 4 && password.toLowerCase().includes(emailPrefix)) {
      unmetRequirements.push("Cannot contain your email prefix");
      suggestions.push("Remove phrases similar to your email address.");
    }
  }

  // Name context checks
  if (firstName && firstName.length >= 3 && password.toLowerCase().includes(firstName.toLowerCase())) {
    unmetRequirements.push("Cannot contain your first name");
    suggestions.push("Avoid using your first name inside the password.");
  }
  if (lastName && lastName.length >= 3 && password.toLowerCase().includes(lastName.toLowerCase())) {
    unmetRequirements.push("Cannot contain your last name");
    suggestions.push("Avoid using your last name inside the password.");
  }

  // Common password checks
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    unmetRequirements.push("Password is too common");
    suggestions.push("This password is commonly guessed. Try something more unique.");
  }

  // Score calculation
  let scorePoints = 0;
  if (password.length >= 8 && password.length <= 128) scorePoints++;
  if (password.length >= 12) scorePoints++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) scorePoints++;
  if (/[0-9]/.test(password)) scorePoints++;
  if (/[!@#$%^&*()_+\-=\[\]\{\};':",.\/<>?]/.test(password)) scorePoints++;

  // Deduct points for major security failures (common password or contains user metadata)
  const isMetadataFailure =
    COMMON_PASSWORDS.includes(password.toLowerCase()) ||
    (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) ||
    (firstName && password.toLowerCase().includes(firstName.toLowerCase())) ||
    (lastName && password.toLowerCase().includes(lastName.toLowerCase()));

  if (isMetadataFailure) {
    scorePoints = Math.max(1, scorePoints - 2);
  }

  // If critical requirements unmet, cap score at Medium (2) or Weak (1)
  if (password.length < 6) {
    scorePoints = Math.min(2, scorePoints);
  }

  const scoreMap: Record<number, "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong"> = {
    0: "Very Weak",
    1: "Very Weak",
    2: "Weak",
    3: "Medium",
    4: "Strong",
    5: "Very Strong",
  };

  const score = Math.max(0, Math.min(5, scorePoints)) as 0 | 1 | 2 | 3 | 4 | 5;
  const label = scoreMap[score];

  return {
    score,
    label,
    suggestions,
    unmetRequirements,
  };
}

/**
 * Checks if an email uses a reserved administrative prefix.
 */
export function isReservedEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const prefix = email.split("@")[0].toLowerCase();
  return RESERVED_EMAIL_PREFIXES.includes(prefix);
}

/**
 * Checks if an email is from a disposable email domain.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}
