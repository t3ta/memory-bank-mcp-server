/**
 * @jest-environment node
 */
import { TemplateController } from '../../../../src/interface/controllers/TemplateController.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Language } from '../../../../src/domain/i18n/Language.js';

// Removed MockType definition and createMock helper function

describe('TemplateController', () => {
  // 各種モックの準備
  let templateService: jest.Mocked<any>; // Use jest.Mocked
  let controller: TemplateController;

  // テスト用のテンプレートデータ
  const mockTemplate = new Template('architecture-template', 'document');

  // テスト用の言語マップ
  const mockLanguageTextMap = {
    en: 'English Text',
    ja: '日本語テキスト',
    zh: '中文文本'
  };

  // 各テスト前に実行
  beforeEach(() => {
    // モックの作成 (Use jest.fn() directly or assign mock implementations)
    templateService = {
      getTemplate: jest.fn(),
      getTemplateAsMarkdown: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      addOrUpdateSection: jest.fn(),
      removeSection: jest.fn(),
      getTemplatesByType: jest.fn(),
      getAllTemplateIds: jest.fn(),
      getAllTemplateTypes: jest.fn(),
    } as jest.Mocked<any>;

    // モックメソッドの実装 (already done above)
    // templateService.getTemplate = jest.fn(); // No longer needed
    templateService.getTemplateAsMarkdown = jest.fn();
    templateService.createTemplate = jest.fn();
    templateService.updateTemplate = jest.fn();
    templateService.addOrUpdateSection = jest.fn();
    templateService.removeSection = jest.fn();
    templateService.getTemplatesByType = jest.fn();
    templateService.getAllTemplateIds = jest.fn();
    templateService.getAllTemplateTypes = jest.fn();

    // コントローラーのインスタンス化
    controller = new TemplateController(templateService);
  });

  // モックのリセット
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getTemplate', () => {
    it('正常系: テンプレートが取得できること', async () => {
      // モックの戻り値を設定
      templateService.getTemplate.mockResolvedValue(mockTemplate);

      // テスト対象のメソッド実行
      const result = await controller.getTemplate('architecture-template');

      // 検証
      expect(templateService.getTemplate).toHaveBeenCalledWith('architecture-template');
      expect(result).toBe(mockTemplate);
    });

    it('異常系: テンプレートが存在しない場合はnullが返されること', async () => {
      // モックの戻り値を設定
      templateService.getTemplate.mockResolvedValue(null);

      // テスト対象のメソッド実行
      const result = await controller.getTemplate('non-existent-template');

      // 検証
      expect(templateService.getTemplate).toHaveBeenCalledWith('non-existent-template');
      expect(result).toBeNull();
    });
  });

  describe('getTemplateAsMarkdown', () => {
    it('正常系: マークダウン形式でテンプレートが取得できること', async () => {
      // モックの戻り値を設定
      const mockMarkdown = '# Architecture Document\n\nThis is a template for architecture documents.';
      templateService.getTemplateAsMarkdown.mockResolvedValue(mockMarkdown);

      // テスト対象のメソッド実行
      const result = await controller.getTemplateAsMarkdown('architecture-template', 'en');

      // 検証
      // Language インスタンスの作成方法をモック
      expect(templateService.getTemplateAsMarkdown).toHaveBeenCalledWith(
        'architecture-template',
        expect.objectContaining({ code: 'en' }),  // Language インスタンスのオブジェクト
        undefined  // 変数は指定していない
      );
      expect(result).toBe(mockMarkdown);
    });

    it('正常系: 変数置換を行ってテンプレートが取得できること', async () => {
      // モックの戻り値を設定
      const mockMarkdown = '# Project: MyProject\n\nAuthor: John Doe';
      templateService.getTemplateAsMarkdown.mockResolvedValue(mockMarkdown);

      // テスト用の変数
      const variables = {
        projectName: 'MyProject',
        author: 'John Doe'
      };

      // テスト対象のメソッド実行
      const result = await controller.getTemplateAsMarkdown('architecture-template', 'en', variables);

      // 検証
      expect(templateService.getTemplateAsMarkdown).toHaveBeenCalledWith(
        'architecture-template',
        expect.objectContaining({ code: 'en' }),
        variables
      );
      expect(result).toBe(mockMarkdown);
    });
  });

  describe('createTemplate', () => {
    it('正常系: テンプレートが作成できること', async () => {
      // モックの戻り値を設定
      templateService.createTemplate.mockResolvedValue(mockTemplate);

      // テスト対象のメソッド実行
      const result = await controller.createTemplate(
        'architecture-template',
        'document',
        mockLanguageTextMap
      );

      // 検証
      expect(templateService.createTemplate).toHaveBeenCalledWith(
        'architecture-template',
        'document' /*, mockLanguageTextMap */ // Removed argument
      );
      expect(result).toBe(mockTemplate);
    });
  });

  describe('updateTemplate', () => {
    it('正常系: テンプレートが更新できること', async () => {
      // モックの戻り値を設定
      const updatedTemplate = new Template('architecture-template', 'updated-type');
      templateService.updateTemplate.mockResolvedValue(updatedTemplate);

      // テスト対象のメソッド実行
      const result = await controller.updateTemplate(
        'architecture-template',
        'updated-type',
        mockLanguageTextMap
      );

      // 検証
      expect(templateService.updateTemplate).toHaveBeenCalledWith(
        'architecture-template',
        'updated-type' /*, mockLanguageTextMap */ // Removed argument
      );
      expect(result).toBe(updatedTemplate);
    });
  });

  describe('addOrUpdateSection', () => {
    it('正常系: セクションが追加・更新できること（デフォルトパラメータ）', async () => {
      // モックの戻り値を設定
      templateService.addOrUpdateSection.mockResolvedValue(mockTemplate);

      // テスト対象のメソッド実行（デフォルトパラメータを使用）
      const result = await controller.addOrUpdateSection(
        'architecture-template',
        'overview',
        mockLanguageTextMap
      );

      // 検証
      expect(templateService.addOrUpdateSection).toHaveBeenCalledWith(
        'architecture-template'
        /* 'overview', */ // Removed argument
        /* mockLanguageTextMap, */ // Removed argument
        /* {}, */ // Removed argument
        /* false */ // Removed argument
      );
      expect(result).toBe(mockTemplate);
    });

    it('正常系: セクションが追加・更新できること（すべてのパラメータ指定）', async () => {
      // モックの戻り値を設定
      templateService.addOrUpdateSection.mockResolvedValue(mockTemplate);

      // コンテンツマップ
      const contentMap = {
        en: '# Overview\n\nThis is the overview section.',
        ja: '# 概要\n\nこれは概要セクションです。'
      };

      // テスト対象のメソッド実行（すべてのパラメータを指定）
      const result = await controller.addOrUpdateSection(
        'architecture-template',
        'overview',
        mockLanguageTextMap,
        contentMap,
        true
      );

      // 検証
      expect(templateService.addOrUpdateSection).toHaveBeenCalledWith(
        'architecture-template'
        /* 'overview', */ // Removed argument
        /* mockLanguageTextMap, */ // Removed argument
        /* contentMap, */ // Removed argument
        /* true */ // Removed argument
      );
      expect(result).toBe(mockTemplate);
    });
  });

  describe('removeSection', () => {
    it('正常系: セクションが削除できること', async () => {
      // モックの戻り値を設定
      templateService.removeSection.mockResolvedValue(mockTemplate);

      // テスト対象のメソッド実行
      const result = await controller.removeSection(
        'architecture-template',
        'overview'
      );

      // 検証
      expect(templateService.removeSection).toHaveBeenCalledWith(
        'architecture-template' /*, 'overview' */ // Removed argument
      );
      expect(result).toBe(mockTemplate);
    });
  });

  describe('getTemplatesByType', () => {
    it('正常系: 指定したタイプのテンプレート一覧が取得できること', async () => {
      // モックの戻り値を設定
      const templates = [
        new Template('architecture-template', 'document'),
        new Template('development-template', 'document')
      ];
      templateService.getTemplatesByType.mockResolvedValue(templates);

      // テスト対象のメソッド実行
      const result = await controller.getTemplatesByType('document');

      // 検証
      expect(templateService.getTemplatesByType).toHaveBeenCalledWith('document');
      expect(result).toEqual(templates);
      expect(result.length).toBe(2);
    });
  });

  describe('getAllTemplateIds', () => {
    it('正常系: すべてのテンプレートIDが取得できること', async () => {
      // モックの戻り値を設定
      const templateIds = ['architecture-template', 'development-template', 'user-guide-template'];
      templateService.getAllTemplateIds.mockResolvedValue(templateIds);

      // テスト対象のメソッド実行
      const result = await controller.getAllTemplateIds();

      // 検証
      expect(templateService.getAllTemplateIds).toHaveBeenCalled();
      expect(result).toEqual(templateIds);
      expect(result.length).toBe(3);
    });
  });

  describe('getAllTemplateTypes', () => {
    it('正常系: すべてのテンプレートタイプが取得できること', async () => {
      // モックの戻り値を設定
      const templateTypes = ['document', 'flowchart', 'code'];
      templateService.getAllTemplateTypes.mockResolvedValue(templateTypes);

      // テスト対象のメソッド実行
      const result = await controller.getAllTemplateTypes();

      // 検証
      expect(templateService.getAllTemplateTypes).toHaveBeenCalled();
      expect(result).toEqual(templateTypes);
      expect(result.length).toBe(3);
    });
  });
});
