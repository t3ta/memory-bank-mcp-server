import { ReadRulesUseCase } from '../../../../../src/application/usecases/common/ReadRulesUseCase.js';
import { TemplateService } from '../../../../../src/application/templates/TemplateService.js'; // ★追加
import { Language } from '../../../../../src/domain/i18n/Language.js'; // ★追加
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js'; // DomainError もインポート
import fs from 'fs/promises';
import path from 'path';
import { vi } from 'vitest'; // ★★★ vi をインポート ★★★
import tmp from 'tmp-promise'; // tmp-promise をインポート

describe('ReadRulesUseCase', () => {
  let useCase: ReadRulesUseCase;
  let tmpDir: tmp.DirectoryResult; // 一時ディレクトリ情報を保持する変数
  let rulesDir: string;
  let mockTemplateService: vi.Mocked<TemplateService>; // ★モックを追加

  const language = new Language('ja'); // Language オブジェクトを使う
  const mockRulesData = { id: 'rules', type: 'system', name: 'テストルール', sections: [{ id: 'sec1', title: 'セクション1', content: '内容1', isOptional: false }] }; // ダミーJSONオブジェクト
  const mockRulesContent = JSON.stringify(mockRulesData, null, 2); // 比較用JSON文字列

  // 各テストの前に一時ディレクトリとファイルを作成
  beforeEach(async () => {
    // disableInherit: true で親プロセスから権限を継承しないようにする
    // unsafeCleanup: true でディレクトリが空でなくても削除できるようにする
    tmpDir = await tmp.dir({ unsafeCleanup: true, keep: false }); // keep: false でテスト後に自動削除しないようにする（手動でやる）
    rulesDir = tmpDir.path;
    // TemplateService のモックを作成
    mockTemplateService = {
      getTemplateAsJsonObject: vi.fn(),
      // 他の TemplateService メソッドのモックが必要ならここに追加
    } as unknown as vi.Mocked<TemplateService>;
    useCase = new ReadRulesUseCase(rulesDir, mockTemplateService); // モックを注入
  });

  // 各テストの後に一時ディレクトリをクリーンアップ
  afterEach(async () => {
    await tmpDir.cleanup(); // 手動でクリーンアップ
  });

  it('should return rules content as JSON string when template is found', async () => {
    // Arrange
    // モックの設定: getTemplateAsJsonObject が呼ばれたら mockRulesData を返す
    mockTemplateService.getTemplateAsJsonObject.mockResolvedValue(mockRulesData);

    // Act
    const result = await useCase.execute(language.code);

    // Assert
    expect(mockTemplateService.getTemplateAsJsonObject).toHaveBeenCalledWith('rules', language); // モックが正しく呼ばれたか
    expect(result).toEqual({ content: mockRulesContent, language: language.code }); // JSON文字列と比較
  });

  // --- 以下のファイルパス依存のテストは不要になるため削除 ---
  // it('should return rules content when rules file is found in default path', async () => { ... });

  // it('should return rules content when rules file is found in templates/json path', async () => { ... });

  // it('should return rules content when rules file is found in domain/templates path', async () => { ... });

  // it('should return rules content when rules file is found in templates/json/rules.json (common path)', async () => { ... });


  it('should throw DomainError if template service throws an error', async () => {
    // Arrange
    const expectedError = new DomainError(DomainErrorCodes.DOCUMENT_NOT_FOUND, 'Template not found');
    // モックの設定: getTemplateAsJsonObject が呼ばれたらエラーを投げる
    mockTemplateService.getTemplateAsJsonObject.mockRejectedValue(expectedError);

    // Act & Assert
    await expect(useCase.execute(language.code)).rejects.toThrow(expectedError);
    expect(mockTemplateService.getTemplateAsJsonObject).toHaveBeenCalledWith('rules', language); // モックが正しく呼ばれたか
  });

  it('should throw DomainError if language is not supported', async () => {
    // Arrange
    const unsupportedLanguage = 'fr';

    // Act & Assert
    await expect(useCase.execute(unsupportedLanguage)).rejects.toThrow(
      `Unsupported language code: ${unsupportedLanguage}. Supported languages are: en, ja, zh`
    );
  });

  // TODO: Add test for TemplateService integration if needed (requires mocking TemplateService)
});
