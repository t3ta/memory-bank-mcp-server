import { ReadRulesUseCase } from '../../../../../src/application/usecases/common/ReadRulesUseCase.js';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js'; // DomainError もインポート
import fs from 'fs/promises';
import path from 'path';
import tmp from 'tmp-promise'; // tmp-promise をインポート

describe('ReadRulesUseCase', () => {
  let useCase: ReadRulesUseCase;
  let tmpDir: tmp.DirectoryResult; // 一時ディレクトリ情報を保持する変数
  let rulesDir: string;

  const language = 'ja';
  const mockRulesData = { general: ['Rule 1'], specific: { 'feature/test': ['Specific Rule'] } };
  const mockRulesContent = JSON.stringify(mockRulesData, null, 2);

  // 各テストの前に一時ディレクトリとファイルを作成
  beforeEach(async () => {
    // disableInherit: true で親プロセスから権限を継承しないようにする
    // unsafeCleanup: true でディレクトリが空でなくても削除できるようにする
    tmpDir = await tmp.dir({ unsafeCleanup: true, keep: false }); // keep: false でテスト後に自動削除しないようにする（手動でやる）
    rulesDir = tmpDir.path;
    useCase = new ReadRulesUseCase(rulesDir);
  });

  // 各テストの後に一時ディレクトリをクリーンアップ
  afterEach(async () => {
    await tmpDir.cleanup(); // 手動でクリーンアップ
  });

  it('should return rules content when rules file is found in default path', async () => {
    // Arrange
    const defaultPath = path.join(rulesDir, `rules-${language}.json`);
    await fs.writeFile(defaultPath, mockRulesContent); // デフォルトパスにファイル作成

    // Act
    const result = await useCase.execute(language);

    // Assert
    expect(result).toEqual({ content: mockRulesContent, language });
  });

  it('should return rules content when rules file is found in templates/json path', async () => {
    // Arrange
    const templateJsonDir = path.join(rulesDir, 'templates', 'json');
    await fs.mkdir(templateJsonDir, { recursive: true }); // ディレクトリ作成
    const templateJsonPath = path.join(templateJsonDir, `rules-${language}.json`);
    await fs.writeFile(templateJsonPath, mockRulesContent); // templates/json パスにファイル作成

    // Act
    const result = await useCase.execute(language);

    // Assert
    expect(result).toEqual({ content: mockRulesContent, language });
  });

   it('should return rules content when rules file is found in domain/templates path', async () => {
    // Arrange
    const domainTemplatesDir = path.join(rulesDir, 'domain', 'templates');
    await fs.mkdir(domainTemplatesDir, { recursive: true }); // ディレクトリ作成
    const domainTemplatesPath = path.join(domainTemplatesDir, `rules-${language}.json`);
    await fs.writeFile(domainTemplatesPath, mockRulesContent); // domain/templates パスにファイル作成

    // Act
    const result = await useCase.execute(language);

    // Assert
    expect(result).toEqual({ content: mockRulesContent, language });
  });

   it('should return rules content when rules file is found in templates/json/rules.json (common path)', async () => {
    // Arrange
    const commonRulesDir = path.join(rulesDir, 'templates', 'json');
    await fs.mkdir(commonRulesDir, { recursive: true }); // ディレクトリ作成
    const commonRulesPath = path.join(commonRulesDir, 'rules.json'); // 共通パス
    await fs.writeFile(commonRulesPath, mockRulesContent);

    // Act
    const result = await useCase.execute(language); // 言語指定しても共通パスが優先されるはず

    // Assert
    expect(result).toEqual({ content: mockRulesContent, language });
  });


  it('should throw DomainError if rules file is not found in any path', async () => {
    // Arrange: ファイルを作成しない

    // Act & Assert
    try {
      await useCase.execute(language);
      // エラーが投げられなかったらテスト失敗
      throw new Error('Expected DomainError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError); // まずDomainErrorインスタンスか確認
      // エラーコードとメッセージの先頭部分をチェック
      expect(error).toHaveProperty('code', 'DOMAIN_ERROR.DOCUMENT_NOT_FOUND'); // 実際のコード値に合わせる (再確認)
      expect((error as Error).message).toContain(`Rules file not found for language: ${language}. Attempted paths:`);
    }
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
