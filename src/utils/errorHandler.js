// errorHandler.js - Centralized error handling system

export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.errorCallbacks = new Set();
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'uncaught',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandledRejection',
        message: event.reason?.message || String(event.reason),
        error: event.reason
      });
    });
  }

  handleError(errorInfo) {
    // Add timestamp
    errorInfo.timestamp = new Date().toISOString();
    
    // Log to console in development
    if (window.APP_DEBUG?.enabled) {
      console.error('[ErrorHandler]', errorInfo);
    }
    
    // Add to error log
    this.errorLog.unshift(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }
    
    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });
    
    // Show user-friendly error based on type
    this.showUserError(errorInfo);
  }

  showUserError(errorInfo) {
    const { type, message, source } = errorInfo;
    
    // Determine error category and user message
    let userMessage = '';
    let severity = 'error';
    
    if (message?.includes('Failed to fetch') || message?.includes('NetworkError')) {
      userMessage = 'Network connection error. Please check your internet connection.';
      severity = 'warning';
    } else if (message?.includes('S3') || message?.includes('Access Denied')) {
      userMessage = 'Unable to access cloud storage. Please try logging in again.';
      severity = 'warning';
    } else if (message?.includes('memory') || message?.includes('Maximum call stack')) {
      userMessage = 'The application ran out of memory. Please refresh the page.';
      severity = 'error';
    } else if (source?.includes('.worker.js')) {
      userMessage = 'Background processing error. Some features may be unavailable.';
      severity = 'warning';
    } else if (type === 'assetLoadError') {
      userMessage = `Unable to load ${errorInfo.assetType || 'asset'}. The file may be corrupted or unsupported.`;
      severity = 'warning';
    } else {
      // Generic error
      userMessage = 'An unexpected error occurred. Please try again.';
      severity = 'error';
    }
    
    // Show notification
    this.showNotification(userMessage, severity);
  }

  showNotification(message, severity = 'error') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.error-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `error-notification ${severity}`;
    notification.innerHTML = `
      <i class="fa fa-${severity === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
      <span class="error-message">${message}</span>
      <button class="error-close">&times;</button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-hide after 5 seconds
    const autoHideTimeout = setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Close button handler
    notification.querySelector('.error-close').addEventListener('click', () => {
      clearTimeout(autoHideTimeout);
      notification.remove();
    });
  }

  // Error reporting methods
  reportError(error, context = {}) {
    const errorInfo = {
      type: 'reported',
      message: error.message || String(error),
      stack: error.stack,
      context,
      error
    };
    
    this.handleError(errorInfo);
  }

  reportAssetError(assetType, fileName, error) {
    this.reportError(error, {
      type: 'assetLoadError',
      assetType,
      fileName
    });
  }

  reportNetworkError(url, error) {
    this.reportError(error, {
      type: 'networkError',
      url
    });
  }

  // Error recovery methods
  async tryWithFallback(operation, fallback, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.reportError(error, context);
      if (fallback) {
        return await fallback(error);
      }
      throw error;
    }
  }

  async retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    this.reportError(lastError, { retries: maxRetries });
    throw lastError;
  }

  // Error log management
  getErrorLog() {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  exportErrorLog() {
    const logData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errors: this.errorLog
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Callback management
  onError(callback) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions for common error handling patterns
export function withErrorHandling(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.reportError(error, { ...context, args });
      throw error;
    }
  };
}

export function withErrorRecovery(fn, fallback, context = {}) {
  return async (...args) => {
    return errorHandler.tryWithFallback(
      () => fn(...args),
      fallback,
      { ...context, args }
    );
  };
}