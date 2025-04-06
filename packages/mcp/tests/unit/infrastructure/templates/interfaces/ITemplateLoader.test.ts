import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import type { ITemplateLoader } from '../../../../../src/infrastructure/templates/interfaces/ITemplateLoader.js'; // .js 追加

// モックデータの準備
const mockTemplateId = 'test-template';
const mockLanguage = 'ja'; // Language は any なので string でOK
const mockVariables = { name: 'Mirai' };
const mockJsonTemplate = { title: 'Test Template {{name}}', content: 'Hello!' }; // JsonTemplate は any なので適当なオブジェクト
const mockMarkdownContent = '# Test Template Mirai\n\nHello!';
// const mockLegacyTemplatePath = '/path/to/legacy/template.md'; // 未使用なので削除

// ITemplateLoader のモック実装を作成
// jest.Mocked を削除し、手動モックの型を指定
// jest.Mocked を削除し、手動モックの型を指定
const mockTemplateLoader: ITemplateLoader = {
  loadJsonTemplate: vi.fn(), // jest -> vi
  getMarkdownTemplate: vi.fn(), // jest -> vi
  // loadLegacyTemplate: vi.fn(), // 削除されたメソッド
  templateExists: vi.fn(), // jest -> vi
};

describe('ITemplateLoader Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
  });

  // --- loadJsonTemplate ---
  it('should define the loadJsonTemplate method (success)', async () => {
    (mockTemplateLoader.loadJsonTemplate as Mock).mockResolvedValue(mockJsonTemplate); // as Mock 追加
    const template = await mockTemplateLoader.loadJsonTemplate(mockTemplateId);
    expect(mockTemplateLoader.loadJsonTemplate).toHaveBeenCalledWith(mockTemplateId);
    expect(template).toEqual(mockJsonTemplate);
  });

  it('should define the loadJsonTemplate method (failure)', async () => {
    const error = new Error('Template not found');
    (mockTemplateLoader.loadJsonTemplate as Mock).mockRejectedValue(error); // as Mock 追加
    await expect(mockTemplateLoader.loadJsonTemplate(mockTemplateId)).rejects.toThrow(error);
    expect(mockTemplateLoader.loadJsonTemplate).toHaveBeenCalledWith(mockTemplateId);
  });

  // --- getMarkdownTemplate ---
  it('should define the getMarkdownTemplate method with variables (success)', async () => {
    (mockTemplateLoader.getMarkdownTemplate as Mock).mockResolvedValue(mockMarkdownContent); // as Mock 追加
    const content = await mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage, mockVariables);
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage, mockVariables);
    expect(content).toBe(mockMarkdownContent);
  });

  it('should define the getMarkdownTemplate method without variables (success)', async () => {
     const contentWithoutVars = '# Test Template \n\nHello!';
    (mockTemplateLoader.getMarkdownTemplate as Mock).mockResolvedValue(contentWithoutVars); // as Mock 追加
    const content = await mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage);
    // variables を省略して呼び出したので、期待値も引数2つにする
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage);
    expect(content).toBe(contentWithoutVars);
  });

  it('should define the getMarkdownTemplate method (failure)', async () => {
    const error = new Error('Language not supported');
    (mockTemplateLoader.getMarkdownTemplate as Mock).mockRejectedValue(error); // as Mock 追加
    await expect(mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage)).rejects.toThrow(error);
    // variables を省略して呼び出したので、期待値も引数2つにする
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage);
  });

  // --- loadLegacyTemplate --- のテストは削除

  // --- templateExists ---
  it('should define the templateExists method (true)', async () => {
    (mockTemplateLoader.templateExists as Mock).mockResolvedValue(true); // as Mock 追加
    const exists = await mockTemplateLoader.templateExists(mockTemplateId);
    expect(mockTemplateLoader.templateExists).toHaveBeenCalledWith(mockTemplateId);
    expect(exists).toBe(true);
  });

  it('should define the templateExists method (false)', async () => {
    (mockTemplateLoader.templateExists as Mock).mockResolvedValue(false); // as Mock 追加
    const exists = await mockTemplateLoader.templateExists(mockTemplateId);
    expect(mockTemplateLoader.templateExists).toHaveBeenCalledWith(mockTemplateId);
    expect(exists).toBe(false);
  });
});
