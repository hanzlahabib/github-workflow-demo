/**
 * Utility functions for formatting numbers, dates, and other display values
 */

/**
 * Format a number to display with K/M suffixes
 * @param num - The number to format
 * @returns Formatted number string (e.g., 1.2K, 3.4M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Parse views string back to number
 * @param viewsStr - Views string with K/M suffix
 * @returns Numeric value
 */
export function parseViews(viewsStr: string): number {
  const multiplier = viewsStr.includes('M') ? 1000000 : viewsStr.includes('K') ? 1000 : 1;
  return parseFloat(viewsStr.replace(/[MK]/g, '')) * multiplier;
}

/**
 * Format engagement metrics with appropriate labels
 * @param metrics - Object containing engagement metrics
 * @returns Formatted metrics object
 */
export function formatEngagementMetrics(metrics: {
  likes?: number;
  shares?: number;
  comments?: number;
  views?: number;
}) {
  return {
    likes: metrics.likes ? formatNumber(metrics.likes) : '0',
    shares: metrics.shares ? formatNumber(metrics.shares) : '0',
    comments: metrics.comments ? formatNumber(metrics.comments) : '0',
    views: metrics.views ? formatNumber(metrics.views) : '0'
  };
}

/**
 * Format duration in seconds to human readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2:30", "1:23:45")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size to human readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.2MB", "567KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + 'KB';
  }
  return bytes + 'B';
}

/**
 * Format date to relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format percentage with proper decimal places
 * @param value - Decimal value (0-1) or percentage (0-100)
 * @param decimals - Number of decimal places
 * @param isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1, isDecimal: boolean = false): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format timestamp to display format
 * @param timestamp - Date timestamp
 * @param format - Format type ('short', 'long', 'time-only')
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: Date | string, format: 'short' | 'long' | 'time-only' = 'short'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time-only':
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format currency values
 * @param amount - Amount in cents or dollars
 * @param currency - Currency code (default: USD)
 * @param inCents - Whether amount is in cents
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD', inCents: boolean = false): string {
  const value = inCents ? amount / 100 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value);
}
