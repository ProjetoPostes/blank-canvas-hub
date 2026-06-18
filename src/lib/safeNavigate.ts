/**
 * Safe navigation utilities to prevent open redirect attacks.
 * All navigation targets are validated against an allowlist of internal paths.
 */

// Allowlist of valid internal route prefixes
const ALLOWED_ROUTE_PREFIXES = [
  "/",
  "/auth",
  "/pending-approval",
  "/tratativas",
  "/consulta",
  
] as const;

/**
 * Validates that a navigation target is a safe internal path.
 * Blocks absolute URLs, protocol-relative URLs, and paths outside the allowlist.
 */
export function isSafeInternalPath(path: string): boolean {
  if (!path || typeof path !== "string") return false;

  // Block absolute URLs (http://, https://, //, etc.)
  if (/^https?:\/\//i.test(path)) return false;
  if (path.startsWith("//")) return false;

  // Block javascript: and data: protocols
  if (/^(javascript|data|vbscript):/i.test(path.trim())) return false;

  // Block encoded variants
  const decoded = decodeURIComponent(path).trim();
  if (/^(javascript|data|vbscript):/i.test(decoded)) return false;
  if (/^https?:\/\//i.test(decoded)) return false;
  if (decoded.startsWith("//")) return false;

  // Must start with /
  if (!path.startsWith("/")) return false;

  // Check against allowlist
  return ALLOWED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  );
}

/**
 * Sanitizes a path for safe navigation. Returns fallback if path is unsafe.
 */
export function sanitizePath(path: string, fallback: string = "/"): string {
  return isSafeInternalPath(path) ? path : fallback;
}
