export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    const logData = {
      timestamp: entry.timestamp,
      level: LogLevel[entry.level],
      message: entry.message,
      context: entry.context,
      ...entry.metadata,
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        }
      })
    };

    return JSON.stringify(logData);
  }

  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      error
    };

    const logLine = this.formatLog(entry);

    // In production, you might want to send logs to external services
    // like CloudWatch, ELK stack, or other log aggregation services
    if (level === LogLevel.ERROR) {
      console.error(logLine);
    } else if (level === LogLevel.WARN) {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }

    // Optional: Send critical errors to monitoring service
    if (level === LogLevel.ERROR && process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(entry);
    }
  }

  private async sendToMonitoring(entry: LogEntry) {
    // Implement monitoring service integration here
    // Examples: Sentry, DataDog, New Relic, etc.
    try {
      // Example implementation for external monitoring
      if (process.env.MONITORING_WEBHOOK_URL) {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // Don't let monitoring failures break the application
      console.error('Failed to send log to monitoring service:', error);
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error) {
    this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  // Specific methods for common use cases
  securityEvent(action: string, metadata: Record<string, any>) {
    this.warn(`Security event: ${action}`, 'SECURITY', metadata);
  }

  apiRequest(method: string, path: string, ip: string, statusCode: number, duration: number) {
    this.info(`${method} ${path}`, 'API', {
      ip,
      statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  fileOperation(action: string, fileId: string, metadata: Record<string, any>) {
    this.info(`File operation: ${action}`, 'FILE', {
      fileId,
      ...metadata
    });
  }
}

export const logger = new Logger();
