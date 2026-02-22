/**
 * RSS Utility Functions
 */

/**
 * Escape special characters for XML content
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Truncate content to specified length
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength).trim() + '...'
}

/**
 * Format date to RFC 822 (RSS standard)
 */
export function formatRssDate(date: Date | string): string {
  return new Date(date).toUTCString()
}
