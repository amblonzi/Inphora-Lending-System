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
    // Future: Send to backend / Sentry
  }

  debug(message, details = null) {
    if (import.meta.env.DEV) {
      console.debug(...this.formatMessage(LOG_LEVELS.DEBUG, message, details));
    }
  }
}

export const logger = new Logger('TytajExpress');
export default Logger;
