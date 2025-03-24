import { JsonPatchUseCase } from '../../../../src/application/usecases/json/JsonPatchUseCase.js';
import { JsonPatchOperation } from '../../../../src/domain/jsonpatch/JsonPatchOperation.js';
import { JsonPatchService } from '../../../../src/domain/jsonpatch/JsonPatchService.js';
import { JsonDocumentRepository } from '../../../../src/domain/repositories/JsonDocumentRepository.js';
import { DocumentEventEmitter } from '../../../../src/domain/events/DocumentEventEmitter.js';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js';
import { JsonDocument } from '../../../../src/domain/entities/JsonDocument.js';
import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo.js';
import { EventType } from '../../../../src/domain/events/EventType.js';

// モックの作成
const createMockRepository = () => {
  return {
    findGlobalDocument: jest.fn(),
    findBranchDocument: jest.fn(),
    saveGlobalDocument: jest.fn(),
    saveBranchDocument: jest.fn()
  } as unknown as JsonDocumentRepository;
};

const createMockPatchService = () => {
  return {
    apply: jest.fn(),
    validate: jest.fn(),
    generatePatch: jest.fn()
  } as unknown as JsonPatchService;
};

const createMockEventEmitter = () => {
  return {
    emit: jest.fn()
  } as unknown as DocumentEventEmitter;
};

describe('JsonPatchUseCase', () => {
  let repository: jest.Mocked<JsonDocumentRepository>;
  let patchService: jest.Mocked<JsonPatchService>;
  let eventEmitter: jest.Mocked<DocumentEventEmitter>;
  let useCase: JsonPatchUseCase;
  
  beforeEach(() => {
    repository = createMockRepository() as any;
    patchService = createMockPatchService() as any;
    eventEmitter = createMockEventEmitter() as any;
    useCase = new JsonPatchUseCase(repository, eventEmitter, patchService);
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('execute', () => {
    const testPath = 'test/document.json';
    const testBranch = 'feature/test';
    const sampleOperation = JsonPatchOperation.create('add', '/test', 'value');
    
    it('グローバルドキュメントに対してパッチを正常に適用できる', async () => {
      // モックの設定
      const originalDocument = new JsonDocument({
        path: testPath,
        content: { test: 'original' },
        versionInfo: new DocumentVersionInfo({
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
          updateReason: 'Create'
        })
      });
      
      repository.findGlobalDocument.mockResolvedValue(originalDocument);
      patchService.validate.mockReturnValue(true);
      patchService.apply.mockReturnValue({ test: 'updated' });
      repository.saveGlobalDocument.mockImplementation((doc) => Promise.resolve(doc));
      
      // 関数の実行
      const result = await useCase.execute(testPath, [sampleOperation]);
      
      // 結果の検証
      expect(repository.findGlobalDocument).toHaveBeenCalledWith(testPath);
      expect(patchService.validate).toHaveBeenCalledWith(originalDocument.content, [sampleOperation]);
      expect(patchService.apply).toHaveBeenCalledWith(originalDocument.content, [sampleOperation]);
      expect(repository.saveGlobalDocument).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(EventType.DOCUMENT_UPDATED, expect.any(Object));
      
      expect(result.path).toBe(testPath);
      expect(result.content).toEqual({ test: 'updated' });
      expect(result.versionInfo.version).toBe(2);
      expect(result.versionInfo.updateReason).toContain('JSON Patch');
    });
    
    it('ブランチドキュメントに対してパッチを正常に適用できる', async () => {
      // モックの設定
      const originalDocument = new JsonDocument({
        path: testPath,
        branch: testBranch,
        content: { test: 'original' },
        versionInfo: new DocumentVersionInfo({
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
          updateReason: 'Create'
        })
      });
      
      repository.findBranchDocument.mockResolvedValue(originalDocument);
      patchService.validate.mockReturnValue(true);
      patchService.apply.mockReturnValue({ test: 'updated' });
      repository.saveBranchDocument.mockImplementation((doc) => Promise.resolve(doc));
      
      // 関数の実行
      const result = await useCase.execute(testPath, [sampleOperation], testBranch);
      
      // 結果の検証
      expect(repository.findBranchDocument).toHaveBeenCalledWith(testPath, testBranch);
      expect(patchService.validate).toHaveBeenCalled();
      expect(patchService.apply).toHaveBeenCalled();
      expect(repository.saveBranchDocument).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalled();
      
      expect(result.path).toBe(testPath);
      expect(result.branch).toBe(testBranch);
      expect(result.content).toEqual({ test: 'updated' });
    });
    
    it('ドキュメントが存在しない場合エラーが発生する', async () => {
      // モックの設定
      repository.findGlobalDocument.mockResolvedValue(null);
      
      // 関数の実行と結果の検証
      await expect(useCase.execute(testPath, [sampleOperation])).rejects.toThrow(DomainError);
      await expect(useCase.execute(testPath, [sampleOperation])).rejects.toThrow('Document not found');
    });
    
    it('パッチ操作が無効な場合エラーが発生する', async () => {
      // モックの設定
      const originalDocument = new JsonDocument({
        path: testPath,
        content: { test: 'original' },
        versionInfo: new DocumentVersionInfo({
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
          updateReason: 'Create'
        })
      });
      
      repository.findGlobalDocument.mockResolvedValue(originalDocument);
      patchService.validate.mockReturnValue(false);
      
      // 関数の実行と結果の検証
      await expect(useCase.execute(testPath, [sampleOperation])).rejects.toThrow(DomainError);
      await expect(useCase.execute(testPath, [sampleOperation])).rejects.toThrow('Invalid JSON patch operation');
    });
  });
  
  describe('executeBatch', () => {
    it('複数の操作を一括で実行する', async () => {
      // モック設定
      const operations = [
        JsonPatchOperation.create('add', '/a', 1),
        JsonPatchOperation.create('add', '/b', 2)
      ];
      
      // executeメソッドをスパイする
      const executeSpy = jest.spyOn(useCase, 'execute').mockResolvedValue({} as JsonDocument);
      
      // 実行
      await useCase.executeBatch('test.json', operations);
      
      // 検証
      expect(executeSpy).toHaveBeenCalledWith('test.json', operations, undefined, 'Batch update via JSON Patch');
    });
  });
  
  describe('generatePatch', () => {
    it('2つのドキュメント間のパッチを生成する', async () => {
      // モックの設定
      const sourceDoc = new JsonDocument({
        path: 'source.json',
        content: { a: 1 },
        versionInfo: new DocumentVersionInfo({
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
          updateReason: 'Create'
        })
      });
      
      const targetDoc = new JsonDocument({
        path: 'target.json',
        content: { a: 1, b: 2 },
        versionInfo: new DocumentVersionInfo({
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
          updateReason: 'Create'
        })
      });
      
      repository.findGlobalDocument.mockImplementation((path) => {
        if (path === 'source.json') return Promise.resolve(sourceDoc);
        if (path === 'target.json') return Promise.resolve(targetDoc);
        return Promise.resolve(null);
      });
      
      const expectedPatches = [JsonPatchOperation.create('add', '/b', 2)];
      patchService.generatePatch.mockResolvedValue(expectedPatches);
      
      // 実行
      const result = await useCase.generatePatch('source.json', 'target.json');
      
      // 検証
      expect(repository.findGlobalDocument).toHaveBeenCalledTimes(2);
      expect(patchService.generatePatch).toHaveBeenCalledWith(sourceDoc.content, targetDoc.content);
      expect(result).toEqual(expectedPatches);
    });
    
    it('ソースドキュメントが存在しない場合エラーが発生する', async () => {
      repository.findGlobalDocument.mockResolvedValue(null);
      
      await expect(useCase.generatePatch('source.json', 'target.json'))
        .rejects.toThrow('Source document not found');
    });
  });
  
  describe('executeConditional', () => {
    it('条件付きパッチを実行する', async () => {
      // モック設定
      const operations = [
        JsonPatchOperation.create('test', '/a', 1),
        JsonPatchOperation.create('add', '/b', 2)
      ];
      
      // executeメソッドをスパイする
      const executeSpy = jest.spyOn(useCase, 'execute').mockResolvedValue({} as JsonDocument);
      
      // 実行
      await useCase.executeConditional('test.json', operations);
      
      // 検証
      expect(executeSpy).toHaveBeenCalledWith(
        'test.json', 
        operations, 
        undefined, 
        'Conditional update via JSON Patch'
      );
    });
  });
});
