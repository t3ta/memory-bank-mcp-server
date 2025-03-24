import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { LoggerFactory, LoggerType } from '../../../../src/infrastructure/logger/LoggerFactory';
import { JsonLogger } from '../../../../src/infrastructure/logger/JsonLogger';
import { LogLevel } from '../../../../src/domain/logger/types';

describe('LoggerFactory', () => {
  beforeEach(() => {
    LoggerFactory.getInstance().clear();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = LoggerFactory.getInstance();
      const instance2 = LoggerFactory.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('createLogger', () => {
    it('should create JsonLogger with default settings', () => {
      const factory = LoggerFactory.getInstance();
      const logger = factory.createLogger({
        type: LoggerType.JSON
      });

      expect(logger).toBeInstanceOf(JsonLogger);
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should create JsonLogger with custom settings', () => {
      const factory = LoggerFactory.getInstance();
      const defaultContext = { app: 'test-app' };

      const logger = factory.createLogger({
        type: LoggerType.JSON,
        minLevel: LogLevel.DEBUG,
        defaultContext
      });

      expect(logger).toBeInstanceOf(JsonLogger);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);

      // コンテキストの検証のためにログを出力
      const stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      logger.info('test');

      const logEntry = JSON.parse((stdoutWrite.mock.calls[0][0] as string).trim());
      expect(logEntry.context).toEqual(defaultContext);

      stdoutWrite.mockRestore();
    });

    it('should throw error for unsupported logger type', () => {
      const factory = LoggerFactory.getInstance();
      expect(() =>
        factory.createLogger({
          type: 'unsupported' as LoggerType
        })
      ).toThrow('Unsupported logger type: unsupported');
    });
  });

  describe('getLogger', () => {
    it('should return the same logger instance for the same name', () => {
      const factory = LoggerFactory.getInstance();
      const logger1 = factory.getLogger('test', {
        type: LoggerType.JSON
      });
      const logger2 = factory.getLogger('test', {
        type: LoggerType.JSON
      });

      expect(logger1).toBe(logger2);
    });

    it('should create new logger for different names', () => {
      const factory = LoggerFactory.getInstance();
      const logger1 = factory.getLogger('test1', {
        type: LoggerType.JSON
      });
      const logger2 = factory.getLogger('test2', {
        type: LoggerType.JSON
      });

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('defaultLogger', () => {
    it('should return a preconfigured JsonLogger', () => {
      const logger = LoggerFactory.getDefaultLogger();

      expect(logger).toBeInstanceOf(JsonLogger);
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should return the same instance on multiple calls', () => {
      const logger1 = LoggerFactory.getDefaultLogger();
      const logger2 = LoggerFactory.getDefaultLogger();

      expect(logger1).toBe(logger2);
    });
  });

  describe('clear', () => {
    it('should remove all cached loggers', () => {
      const factory = LoggerFactory.getInstance();
      const logger1 = factory.getLogger('test1', {
        type: LoggerType.JSON
      });

      factory.clear();

      const logger2 = factory.getLogger('test1', {
        type: LoggerType.JSON
      });

      expect(logger1).not.toBe(logger2);
    });
  });
});
