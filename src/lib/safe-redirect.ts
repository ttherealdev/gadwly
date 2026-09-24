/**
 * Accepts only same-origin, path-relative targets.
 * Rejects "//evil.com", "/\evil.com", absolute URLs, and anything with
 * backslashes or CR/LF (browsers normalise "\" to "/", so they must not pass).
 */
const SAFE_PATH = /^\/(?![/\\])[^\\\r\n]*$/;

export function safeRedirectPath(
  input: string | null | undefined,
  fallback = "/",
): string {
  return input && SAFE_PATH.test(input) ? input : fallback;
}
