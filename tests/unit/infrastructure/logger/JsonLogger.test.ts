import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { JsonLogger } from '../../../../src/infrastructure/logger/JsonLogger';
import { LogLevel, LogContext } from '../../../../src/domain/logger/types';
import { Writable } from 'stream';

describe('JsonLogger', () => {
  let logger: JsonLogger;
  let stdoutWrite: jest.MockedFunction<typeof process.stdout.write>;
  let stderrWrite: jest.MockedFunction<typeof process.stderr.write>;

  beforeEach(() => {
    logger = new JsonLogger();
    stdoutWrite = jest.spyOn(process.stdout, 'write') as jest.MockedFunction<typeof process.stdout.write>;
    stderrWrite = jest.spyOn(process.stderr, 'write') as jest.MockedFunction<typeof process.stderr.write>;

    stdoutWrite.mockImplementation(() => true);
    stderrWrite.mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should write log entry to stdout for non-error levels', () => {
      const message = 'Test message';
      const context: LogContext = { key: 'value' };

      logger.info(message, context);

      expect(stdoutWrite).toHaveBeenCalledTimes(1);
      expect(stderrWrite).not.toHaveBeenCalled();

      const logEntry = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(logEntry).toEqual(expect.objectContaining({
        level: LogLevel.INFO,
        message,
        context
      }));
    });

    it('should write log entry to stderr for error level', () => {
      const message = 'Error message';
      const context: LogContext = { error: 'Test error' };

      logger.error(message, context);

      expect(stderrWrite).toHaveBeenCalledTimes(1);
      expect(stdoutWrite).not.toHaveBeenCalled();

      const logEntry = JSON.parse((stderrWrite.mock.calls[0][0] as string).trim());
      expect(logEntry).toEqual(expect.objectContaining({
        level: LogLevel.ERROR,
        message,
        context
      }));
    });
  });

  describe('log level control', () => {
    it('should respect minimum log level', () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // debug と info は出力されないはず
      expect(stdoutWrite).toHaveBeenCalledTimes(1);
      expect(stderrWrite).toHaveBeenCalledTimes(1);

      const warnLog = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(warnLog.level).toBe(LogLevel.WARN);

      const errorLog = JSON.parse((stderrWrite.mock.calls[0][0] as string).trim());
      expect(errorLog.level).toBe(LogLevel.ERROR);
    });
  });

  describe('context management', () => {
    it('should merge default context with log context', () => {
      const defaultContext = { app: 'test-app', env: 'test' };
      const logContext = { operation: 'test' };

      logger.configure({ defaultContext });
      logger.info('Test message', logContext);

      const logEntry = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(logEntry.context).toEqual({
        ...defaultContext,
        ...logContext
      });
    });

    it('should create new logger instance with additional context', () => {
      const defaultContext = { app: 'test-app' };
      const additionalContext = { component: 'test-component' };

      logger.configure({ defaultContext });
      const newLogger = logger.withContext(additionalContext);

      newLogger.info('Test message');

      const logEntry = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(logEntry.context).toEqual({
        ...defaultContext,
        ...additionalContext
      });
    });
  });

  describe('timestamp', () => {
    it('should include ISO formatted timestamp', () => {
      logger.info('Test message');

      const logEntry = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(logEntry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
