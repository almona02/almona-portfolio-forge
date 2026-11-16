/**
 * Sanitize post-login return destinations.
 * Only same-origin relative paths (pathname + search + hash) are allowed.
 */
export function buildReturnPath(location: {
  pathname: string
  search?: string
  hash?: string
}): string {
  const pathname = location.pathname || '/'
  const search = location.search ?? ''
  const hash = location.hash ?? ''
  return `${pathname}${search}${hash}`
}

/**
 * Accept only internal relative destinations. Reject protocol-relative,
 * absolute URLs, backslash tricks, and malformed values.
 */
export function safeReturnPath(
  candidate: unknown,
  fallback: string,
): string {
  if (typeof candidate !== 'string' || !candidate) return fallback

  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/')) return fallback
  if (trimmed.startsWith('//')) return fallback
  if (trimmed.includes('://')) return fallback
  if (trimmed.includes('\\')) return fallback
  // Block encoded separators / control that could escape relative form
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed.slice(1))) return fallback

  return trimmed
}
