/**
 * Simple notification utility for MOSD system
 * Provides basic toast notifications for user feedback
 */

export interface NotificationConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/**
 * Show a toast notification to the user
 */
export const showNotification = (config: NotificationConfig): void => {
  const { title, message, type, duration = 3000 } = config;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <strong>${title}</strong>
    <p>${message}</p>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
};

/**
 * Show success notification
 */
export const showSuccess = (title: string, message: string): void => {
  showNotification({ title, message, type: 'success' });
};

/**
 * Show error notification
 */
export const showError = (title: string, message: string): void => {
  showNotification({ title, message, type: 'error' });
};