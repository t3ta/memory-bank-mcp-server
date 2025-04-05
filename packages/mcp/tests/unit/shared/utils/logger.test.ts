import { createConsoleLogger, logger as defaultLogger, LogLevel, LOG_LEVEL_PRIORITY } from '../../../../src/shared/utils/logger';
import { jest } from '@jest/globals';

// Mock console.log
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Console Logger', () => {
  beforeEach(() => {
    // Reset mocks before each test
    consoleLogSpy.mockClear();
    // Reset default logger level for consistency if needed
    defaultLogger.setLevel('warn');
  });

  afterAll(() => {
    // Restore original console.log after all tests
    consoleLogSpy.mockRestore();
  });

  describe('createConsoleLogger', () => {
    it('should create a logger instance', () => {
      const logger = createConsoleLogger();
      expect(logger).toBeDefined();
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.log).toBeInstanceOf(Function);
      expect(logger.setLevel).toBeInstanceOf(Function);
      expect(logger.getLevel).toBeInstanceOf(Function);
      expect(logger.withContext).toBeInstanceOf(Function);
    });

    it('should default to "info" level if not specified', () => {
      const logger = createConsoleLogger();
      expect(logger.getLevel()).toBe('info');
    });

    it('should set the initial log level correctly', () => {
      const logger = createConsoleLogger('debug');
      expect(logger.getLevel()).toBe('debug');
      const warnLogger = createConsoleLogger('warn');
      expect(warnLogger.getLevel()).toBe('warn');
    });
  });

  describe('Logging Levels', () => {
    const logger = createConsoleLogger('info'); // Test with 'info' level

    it('should log messages at or above the current level', () => {
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should NOT log messages below the current level', () => {
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should change log level using setLevel', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
      logger.debug('Debug message after level change');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);

      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
      logger.warn('Warn message after level change');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Still 1, warn is below error
      logger.error('Error message after level change');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should use the generic log method correctly', () => {
        logger.setLevel('info'); // Reset level
        logger.log('debug', 'Generic debug'); // Below level
        logger.log('info', 'Generic info');
        logger.log('warn', 'Generic warn');
        logger.log('error', 'Generic error');
        expect(consoleLogSpy).toHaveBeenCalledTimes(3); // info, warn, error
      });
  });

  describe('Log Output Format (JSON)', () => {
    const logger = createConsoleLogger('debug'); // Log everything for format checks

    it('should output logs in JSON format with level, message, and timestamp', () => {
      const message = 'Test info message';
      logger.info(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('message', message);
      expect(logEntry).toHaveProperty('timestamp');
      expect(typeof logEntry.timestamp).toBe('string'); // ISO string format
    });

    it('should include context object in the log entry', () => {
      const message = 'User logged in';
      const context = { userId: 123, component: 'AuthService' };
      logger.info(message, context);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('message', message);
      expect(logEntry).toHaveProperty('userId', 123);
      expect(logEntry).toHaveProperty('component', 'AuthService');
      expect(logEntry).toHaveProperty('timestamp');
    });

     it('should handle multiple arguments by putting them in an "args" array', () => {
        const loggerMulti = createConsoleLogger('debug');
        loggerMulti.info('Multiple args test', 1, 'two', { three: 3 });
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

        expect(logEntry).toHaveProperty('level', 'info');
        expect(logEntry).toHaveProperty('message', 'Multiple args test');
        expect(logEntry).toHaveProperty('args', [1, 'two', { three: 3 }]);
        expect(logEntry).toHaveProperty('timestamp');
      });

    it('should correctly handle Error object in error logs', () => {
      const message = 'Something went wrong';
      const error = new Error('Test error message');
      error.stack = 'Test stack trace'; // Mock stack trace

      logger.error(message, error);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toHaveProperty('level', 'error');
      expect(logEntry).toHaveProperty('message', message);
      expect(logEntry).toHaveProperty('error');
      expect(logEntry.error).toHaveProperty('message', 'Test error message');
      expect(logEntry.error).toHaveProperty('stack', 'Test stack trace');
      expect(logEntry.error).toHaveProperty('name', 'Error');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).not.toHaveProperty('args'); // Error should be extracted, not in args
    });

     it('should handle Error object and context object together in error logs', () => {
        const message = 'Failed operation';
        const error = new Error('Operation failed');
        const context = { operationId: 'op-123' };

        logger.error(message, context, error); // Pass context and error
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

        expect(logEntry).toHaveProperty('level', 'error');
        expect(logEntry).toHaveProperty('message', message);
        expect(logEntry).toHaveProperty('operationId', 'op-123'); // Context should be merged
        expect(logEntry).toHaveProperty('error');
        expect(logEntry.error).toHaveProperty('message', 'Operation failed');
        expect(logEntry).not.toHaveProperty('args');
      });
  });

  describe('withContext', () => {
    const parentLogger = createConsoleLogger('debug');
    const parentContext = { component: 'Parent', requestId: 'req-abc' };
    const childLogger = parentLogger.withContext(parentContext);

    it('should create a child logger', () => {
      expect(childLogger).toBeDefined();
      expect(childLogger).not.toBe(parentLogger);
      expect(childLogger.getLevel()).toBe(parentLogger.getLevel());
    });

    it('should include parent context in child logs', () => {
      childLogger.info('Child message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toHaveProperty('component', 'Parent');
      expect(logEntry).toHaveProperty('requestId', 'req-abc');
      expect(logEntry).toHaveProperty('message', 'Child message');
    });

    it('should merge parent and child contexts (child overrides parent)', () => {
      const childContext = { component: 'Child', userId: 456 };
      childLogger.info('Child message with context', childContext);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toHaveProperty('component', 'Child'); // Child overrides parent
      expect(logEntry).toHaveProperty('requestId', 'req-abc'); // Parent context preserved
      expect(logEntry).toHaveProperty('userId', 456); // Child context added
      expect(logEntry).toHaveProperty('message', 'Child message with context');
    });

     it('should create grandchild logger with merged context', () => {
        const grandChildContext = { documentPath: '/doc.txt' };
        const grandChildLogger = childLogger.withContext(grandChildContext);

        grandChildLogger.warn('Grandchild message');
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

        expect(logEntry).toHaveProperty('component', 'Parent'); // From parent
        expect(logEntry).toHaveProperty('requestId', 'req-abc'); // From parent
        expect(logEntry).toHaveProperty('documentPath', '/doc.txt'); // From grandchild
        expect(logEntry).toHaveProperty('message', 'Grandchild message');
      });

      it('child logger level should be independent after creation', () => {
        parentLogger.setLevel('warn');
        // Child logger was created when parent was 'debug', should remain 'debug'
        expect(childLogger.getLevel()).toBe('debug');
        childLogger.debug('Child debug message'); // Should still log
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);

        childLogger.setLevel('error');
        expect(childLogger.getLevel()).toBe('error');
        expect(parentLogger.getLevel()).toBe('warn'); // Parent level unchanged
      });
  });

  describe('Default Logger Instance', () => {
    it('should have default level "warn"', () => {
      expect(defaultLogger.getLevel()).toBe('warn');
    });

    it('should log warn and error by default', () => {
      defaultLogger.info('Default info'); // Should not log
      defaultLogger.warn('Default warn');
      defaultLogger.error('Default error');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });
  });
});
