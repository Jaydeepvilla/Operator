/**
 * Destination Validator
 * 
 * Lightweight, dependency-free validator for internal redirection destinations.
 * Safe to import in Edge Middleware, Server Components, and Client Components.
 */

export function validateIntendedDestination(url?: string | null): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();

  // Must start with exactly one '/', must not start with '//' or contain backslashes or protocol schemes
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    return null;
  }

  // Reject sensitive internal API routes or auth pages as redirect destinations
  if (
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("/sign-in") ||
    trimmed.startsWith("/sign-up") ||
    trimmed.startsWith("/forgot-password") ||
    trimmed.startsWith("/reset-password") ||
    trimmed.startsWith("/login-success")
  ) {
    return null;
  }

  return trimmed;
}

