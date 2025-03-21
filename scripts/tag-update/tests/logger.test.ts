import { Logger, LogLevel } from '../src/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // console.logをモック化
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // モックをリセット
    consoleLogSpy.mockRestore();
  });
  
  test('ログレベルに応じたメッセージのフィルタリング', () => {
    const logger = new Logger(LogLevel.INFO);
    
    // DEBUGレベルのメッセージは出力されない
    logger.debug('デバッグメッセージ');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    // INFOレベル以上のメッセージは出力される
    logger.info('情報メッセージ');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    
    logger.warning('警告メッセージ');
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    
    logger.error('エラーメッセージ');
    expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    
    // ログレベルを変更するとフィルタリングが変わる
    logger.setLogLevel(LogLevel.WARNING);
    
    logger.info('情報メッセージ2');
    expect(consoleLogSpy).toHaveBeenCalledTimes(3); // 変わらない
    
    logger.warning('警告メッセージ2');
    expect(consoleLogSpy).toHaveBeenCalledTimes(4); // 増える
    
    logger.error('エラーメッセージ2');
    expect(consoleLogSpy).toHaveBeenCalledTimes(5); // 増える
  });
  
  test('統計情報の取得', () => {
    const logger = new Logger(LogLevel.DEBUG);
    
    logger.debug('デバッグメッセージ');
    logger.info('情報メッセージ');
    logger.info('情報メッセージ2');
    logger.warning('警告メッセージ');
    logger.error('エラーメッセージ');
    
    const stats = logger.getStats();
    
    expect(stats.total).toBe(5);
    expect(stats.byLevel.DEBUG).toBe(1);
    expect(stats.byLevel.INFO).toBe(2);
    expect(stats.byLevel.WARNING).toBe(1);
    expect(stats.byLevel.ERROR).toBe(1);
  });
  
  test('ログの取得', () => {
    const logger = new Logger(LogLevel.DEBUG);
    
    logger.debug('デバッグメッセージ');
    logger.info('情報メッセージ');
    
    const logs = logger.getLogs();
    
    expect(logs.length).toBe(2);
    expect(logs[0].level).toBe(LogLevel.DEBUG);
    expect(logs[0].message).toBe('デバッグメッセージ');
    expect(logs[1].level).toBe(LogLevel.INFO);
    expect(logs[1].message).toBe('情報メッセージ');
  });
});