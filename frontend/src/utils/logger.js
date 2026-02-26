/**
 * TytajExpress Frontend Logger
 * Provides structured logging with levels and styling.
 */

const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

const STYLES = {
  info: 'color: #0070F3; font-weight: bold;',
  warn: 'color: #F5A623; font-weight: bold;',
  error: 'color: #D0021B; font-weight: bold;',
  debug: 'color: #BD10E0; font-weight: bold;',
  label: 'color: #666; font-weight: normal;',
};

class Logger {
  constructor(namespace = 'App') {
    this.namespace = namespace;
  }

  formatMessage(level, message, details) {
    const timestamp = new Date().toLocaleTimeString();
    return [`%c[${timestamp}] [${this.namespace}] ${level.toUpperCase()}:`, STYLES[level], message, details || ''];
  }

  info(message, details = null) {
    console.log(...this.formatMessage(LOG_LEVELS.INFO, message, details));
  }

  warn(message, details = null) {
    console.warn(...this.formatMessage(LOG_LEVELS.WARN, message, details));
  }

  error(message, error = null) {
    console.error(...this.formatMessage(LOG_LEVELS.ERROR, message, error));
    
    // Send to backend error logging service
    this.sendToBackend('error', message, error);
  }

  async sendToBackend(level, message, error = null) {
    try {
      const errorData = {
        level,
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        namespace: this.namespace
      };

      // Send to backend logging endpoint
      const response = await fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        console.warn('Failed to send error log to backend:', response.statusText);
      }
    } catch (e) {
      console.warn('Error sending log to backend:', e);
    }
  }

  debug(message, details = null) {
    if (import.meta.env.DEV) {
      console.debug(...this.formatMessage(LOG_LEVELS.DEBUG, message, details));
    }
  }
}

export const logger = new Logger('TytajExpress');
export default Logger;
