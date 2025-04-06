import { ReadRulesUseCase } from '../../../../../src/application/usecases/common/ReadRulesUseCase.js';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js'; // DomainError もインポート
import fs from 'fs/promises';
import path from 'path';
import { TemplateService } from '../../../../../src/application/templates/TemplateService.js'; // ★★★ コメント解除 ★★★
import { Template } from '../../../../../src/domain/templates/Template.js'; // ★★★ コメント解除 ★★★
// import tmp from 'tmp-promise'; // みらい... 一時ディレクトリは不要なので削除
import { fileURLToPath } from 'node:url'; // みらい... パス解決のため追加

const __filename = fileURLToPath(import.meta.url); // みらい... パス解決のため追加
const __dirname = path.dirname(__filename); // みらい... パス解決のため追加

describe('ReadRulesUseCase', () => {
  let useCase: ReadRulesUseCase;
  // let tmpDir: tmp.DirectoryResult; // みらい... 削除
  // let rulesDir: string; // みらい... 削除 (UseCaseにはダミーパスを渡す)
  let actualRulesContent: string; // みらい... 実際のrules.jsonの内容を保持する変数

  const language = 'ja'; // テストケースによっては使う
  // const mockRulesData = { general: ['Rule 1'], specific: { 'feature/test': ['Specific Rule'] } }; // みらい... 削除
  // const mockRulesContent = JSON.stringify(mockRulesData, null, 2); // みらい... 削除

  // 各テストの前に実際の rules.json を読み込む
  beforeAll(async () => { // みらい... beforeEach -> beforeAll に変更 (読み込みは1回でOK)
    // みらい... 実際の rules.json のパスを取得
    const actualRulesPath = path.resolve(__dirname, '../../../../../src/templates/json/rules.json');
    actualRulesContent = await fs.readFile(actualRulesPath, 'utf-8');
    // ★★★ TemplateService のモックを作成 ★★★
    const mockTemplateService = {
      getTemplate: jest.fn() // getTemplate メソッドをモック
    } as unknown as TemplateService; // 型アサーション

    // ★★★ UseCaseのインスタンス化時にモックを渡す ★★★
    useCase = new ReadRulesUseCase('/dummy/rules/dir', mockTemplateService);
  });

  // みらい... afterEach は不要なので削除

  // みらい... 仕様変更により、常に src/templates/json/rules.json を読むようになったため、テストケースを1つにまとめる
  it('should return the content of src/templates/json/rules.json regardless of the specified language', async () => {
    // Arrange (beforeAll で useCase と actualRulesContent は準備済み)

    // Act
    const result = await useCase.execute(language); // 'ja' を指定

    // Assert
    // ★★★ 期待値を実際のファイル内容に戻す ★★★
    expect(result).toEqual({ content: actualRulesContent, language });

    // Act (別の言語 'en' でも試す)
    const resultEn = await useCase.execute('en');
    // Assert
    // ★★★ 期待値を実際のファイル内容に戻す ★★★
    expect(resultEn).toEqual({ content: actualRulesContent, language: 'en' });
  });


  // みらい... エラーケースのテストも修正。fs.readFile が失敗するケースをモックする
  it('should throw DomainError if reading rules.json fails', async () => {
    // Arrange
    // ★★★ fs.readFile のモックでエラーを発生させるように戻す ★★★
    const readFileError = new Error('Permission denied');
    const mockFs = jest.spyOn(fs, 'readFile').mockRejectedValueOnce(readFileError);
    const expectedPath = path.resolve(__dirname, '../../../../../src/templates/json/rules.json');

    // Act & Assert
    try {
      await useCase.execute(language);
      throw new Error('Expected DomainError to be thrown'); // エラーが投げられなかったらテスト失敗
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      // ★★★ エラーコードとメッセージを fs.readFile のエラーケースに戻す ★★★
      expect(error).toHaveProperty('code', 'DOMAIN_ERROR.DOCUMENT_NOT_FOUND'); // ★★★ 期待値を実際のコード文字列に修正 ★★★
      expect((error as Error).message).toContain(`Rules file not found at path: ${expectedPath}`);
      expect((error as DomainError).details).toHaveProperty('originalError', readFileError);
      expect((error as DomainError).details).toHaveProperty('attemptedPath', expectedPath);
    } finally {
      mockFs.mockRestore(); // ★★★ モックのリストアを復活 ★★★
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
