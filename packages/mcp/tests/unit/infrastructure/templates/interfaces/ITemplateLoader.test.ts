import type { ITemplateLoader } from '../../../../../src/infrastructure/templates/interfaces/ITemplateLoader';

// モックデータの準備
const mockTemplateId = 'test-template';
const mockLanguage = 'ja'; // Language は any なので string でOK
const mockVariables = { name: 'Mirai' };
const mockJsonTemplate = { title: 'Test Template {{name}}', content: 'Hello!' }; // JsonTemplate は any なので適当なオブジェクト
const mockMarkdownContent = '# Test Template Mirai\n\nHello!';
const mockLegacyTemplatePath = '/path/to/legacy/template.md';

// ITemplateLoader のモック実装を作成
const mockTemplateLoader: jest.Mocked<ITemplateLoader> = {
  loadJsonTemplate: jest.fn(),
  getMarkdownTemplate: jest.fn(),
  loadLegacyTemplate: jest.fn(),
  templateExists: jest.fn(),
};

describe('ITemplateLoader Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  // --- loadJsonTemplate ---
  it('should define the loadJsonTemplate method (success)', async () => {
    mockTemplateLoader.loadJsonTemplate.mockResolvedValue(mockJsonTemplate);
    const template = await mockTemplateLoader.loadJsonTemplate(mockTemplateId);
    expect(mockTemplateLoader.loadJsonTemplate).toHaveBeenCalledWith(mockTemplateId);
    expect(template).toEqual(mockJsonTemplate);
  });

  it('should define the loadJsonTemplate method (failure)', async () => {
    const error = new Error('Template not found');
    mockTemplateLoader.loadJsonTemplate.mockRejectedValue(error);
    await expect(mockTemplateLoader.loadJsonTemplate(mockTemplateId)).rejects.toThrow(error);
    expect(mockTemplateLoader.loadJsonTemplate).toHaveBeenCalledWith(mockTemplateId);
  });

  // --- getMarkdownTemplate ---
  it('should define the getMarkdownTemplate method with variables (success)', async () => {
    mockTemplateLoader.getMarkdownTemplate.mockResolvedValue(mockMarkdownContent);
    const content = await mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage, mockVariables);
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage, mockVariables);
    expect(content).toBe(mockMarkdownContent);
  });

  it('should define the getMarkdownTemplate method without variables (success)', async () => {
     const contentWithoutVars = '# Test Template \n\nHello!';
    mockTemplateLoader.getMarkdownTemplate.mockResolvedValue(contentWithoutVars);
    const content = await mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage);
    // variables を省略して呼び出したので、期待値も引数2つにする
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage);
    expect(content).toBe(contentWithoutVars);
  });

  it('should define the getMarkdownTemplate method (failure)', async () => {
    const error = new Error('Language not supported');
    mockTemplateLoader.getMarkdownTemplate.mockRejectedValue(error);
    await expect(mockTemplateLoader.getMarkdownTemplate(mockTemplateId, mockLanguage)).rejects.toThrow(error);
    // variables を省略して呼び出したので、期待値も引数2つにする
    expect(mockTemplateLoader.getMarkdownTemplate).toHaveBeenCalledWith(mockTemplateId, mockLanguage);
  });

  // --- loadLegacyTemplate ---
  it('should define the loadLegacyTemplate method (success)', async () => {
    mockTemplateLoader.loadLegacyTemplate.mockResolvedValue(mockMarkdownContent);
    const content = await mockTemplateLoader.loadLegacyTemplate(mockLegacyTemplatePath, mockLanguage);
    expect(mockTemplateLoader.loadLegacyTemplate).toHaveBeenCalledWith(mockLegacyTemplatePath, mockLanguage);
    expect(content).toBe(mockMarkdownContent);
  });

  it('should define the loadLegacyTemplate method (failure)', async () => {
    const error = new Error('Legacy template not found');
    mockTemplateLoader.loadLegacyTemplate.mockRejectedValue(error);
    await expect(mockTemplateLoader.loadLegacyTemplate(mockLegacyTemplatePath, mockLanguage)).rejects.toThrow(error);
    expect(mockTemplateLoader.loadLegacyTemplate).toHaveBeenCalledWith(mockLegacyTemplatePath, mockLanguage);
  });

  // --- templateExists ---
  it('should define the templateExists method (true)', async () => {
    mockTemplateLoader.templateExists.mockResolvedValue(true);
    const exists = await mockTemplateLoader.templateExists(mockTemplateId);
    expect(mockTemplateLoader.templateExists).toHaveBeenCalledWith(mockTemplateId);
    expect(exists).toBe(true);
  });

  it('should define the templateExists method (false)', async () => {
    mockTemplateLoader.templateExists.mockResolvedValue(false);
    const exists = await mockTemplateLoader.templateExists(mockTemplateId);
    expect(mockTemplateLoader.templateExists).toHaveBeenCalledWith(mockTemplateId);
    expect(exists).toBe(false);
  });
});
