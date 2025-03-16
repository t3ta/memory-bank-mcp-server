/**
 * Tests for JsonTemplateLoader.ts
 */
import { JsonTemplateLoader } from '../JsonTemplateLoader.js';
import { JsonTemplate } from '../../../schemas/v2/template-schema.js';
import { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import path from 'path';

// Mock file system service
const mockFileSystemService: jest.Mocked<IFileSystemService> = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  directoryExists: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
  readFileChunk: jest.fn(),
  getBranchMemoryPath: jest.fn(),
  getConfig: jest.fn(),
};

// Sample template for testing
const sampleTemplate: JsonTemplate = {
  schema: 'template_v1',
  metadata: {
    id: 'test-template',
    name: { 
      en: 'Test Template', 
      ja: 'テストテンプレート'
    },
    type: 'test',
    lastModified: '2023-01-01T00:00:00.000Z'
  },
  content: {
    sections: {
      introduction: {
        title: { 
          en: 'Introduction', 
          ja: 'はじめに' 
        },
        content: { 
          en: 'This is the introduction.', 
          ja: 'これははじめにです。' 
        },
        optional: false
      },
      summary: {
        title: { 
          en: 'Summary', 
          ja: '要約' 
        },
        content: { 
          en: 'This is the summary.', 
          ja: 'これは要約です。' 
        },
        optional: false
      },
      optional: {
        title: { 
          en: 'Optional Section', 
          ja: '任意セクション' 
        },
        content: { 
          en: 'This is optional.', 
          ja: 'これは任意です。' 
        },
        optional: true
      }
    },
    placeholders: {
      'TITLE': 'The title placeholder',
      'CONTENT': 'The content placeholder'
    }
  }
};

describe('JsonTemplateLoader', () => {
  let templateLoader: JsonTemplateLoader;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new loader with mocked file system
    templateLoader = new JsonTemplateLoader(mockFileSystemService);
    
    // Mock implementation for readFile to return sample template
    mockFileSystemService.readFile.mockImplementation((filePath: string) => {
      if (filePath.includes('test-template.json')) {
        return Promise.resolve(JSON.stringify(sampleTemplate));
      } else if (filePath.includes('legacy-template.md')) {
        return Promise.resolve('## Introduction\n\nLegacy content.\n\n## Summary\n\nMore legacy content.');
      } else if (filePath.includes('legacy-template-en.md')) {
        return Promise.resolve('## Introduction\n\nEnglish legacy content.\n\n## Summary\n\nMore English legacy content.');
      }
      
      return Promise.reject(new Error('File not found'));
    });
    
    // Mock implementation for fileExists
    mockFileSystemService.fileExists.mockImplementation((filePath: string) => {
      if (
        filePath.includes('test-template.json') || 
        filePath.includes('legacy-template.md') || 
        filePath.includes('legacy-template-en.md')
      ) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
  });
  
  describe('getTemplateContent', () => {
    it('should load and convert a JSON template to markdown', async () => {
      // Arrange
      const templateId = 'test-template';
      const language = 'en';
      
      // Act
      const result = await templateLoader.getTemplateContent(templateId, language);
      
      // Assert
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      
      // Check that markdown conversion happened correctly
      expect(result).toContain('## Introduction');
      expect(result).toContain('This is the introduction.');
      expect(result).toContain('## Summary');
      expect(result).toContain('This is the summary.');
      expect(result).toContain('## Optional Section');
      expect(result).toContain('This is optional.');
    });
    
    it('should fall back to legacy template if JSON template not found', async () => {
      // Arrange
      const templateId = 'legacy-template';
      const language = 'en';
      
      // Mock fileExists to return false for JSON and true for legacy
      mockFileSystemService.fileExists.mockImplementation((filePath: string) => {
        if (filePath.includes('legacy-template.json')) {
          return Promise.resolve(false);
        } else if (filePath.includes('legacy-template-en.md')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });
      
      // Act
      const result = await templateLoader.getTemplateContent(templateId, language);
      
      // Assert
      expect(result).toContain('English legacy content.');
    });
    
    it('should throw error if template language not supported', async () => {
      // Arrange
      const templateId = 'test-template';
      const language = 'fr'; // Not supported in our sample
      
      // Act & Assert
      await expect(templateLoader.getTemplateContent(templateId, language))
        .rejects.toThrow('Language "fr" not supported');
    });
  });
  
  describe('getTemplateObject', () => {
    it('should return the raw JSON template object', async () => {
      // Arrange
      const templateId = 'test-template';
      
      // Act
      const result = await templateLoader.getTemplateObject(templateId);
      
      // Assert
      expect(result).toEqual(sampleTemplate);
    });
    
    it('should throw error if template not found', async () => {
      // Arrange
      const templateId = 'nonexistent-template';
      
      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);
      
      // Act & Assert
      await expect(templateLoader.getTemplateObject(templateId))
        .rejects.toThrow('Template not found');
    });
  });
  
  describe('getTemplateSection', () => {
    it('should return specific section content', async () => {
      // Arrange
      const templateId = 'test-template';
      const sectionId = 'introduction';
      const language = 'ja';
      
      // Act
      const result = await templateLoader.getTemplateSection(templateId, sectionId, language);
      
      // Assert
      expect(result).toBe('これははじめにです。');
    });
    
    it('should throw error if section not found', async () => {
      // Arrange
      const templateId = 'test-template';
      const sectionId = 'nonexistent-section';
      const language = 'en';
      
      // Act & Assert
      await expect(templateLoader.getTemplateSection(templateId, sectionId, language))
        .rejects.toThrow('Section "nonexistent-section" not found');
    });
  });
  
  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      // Arrange
      const templateId = 'test-template';
      
      // Act
      const result = await templateLoader.getSupportedLanguages(templateId);
      
      // Assert
      expect(result).toContain('en');
      expect(result).toContain('ja');
      expect(result.length).toBe(2);
    });
  });
  
  describe('getTemplateFromPath', () => {
    it('should load template directly from file path', async () => {
      // Arrange
      const filePath = '/path/to/legacy-template.md';
      
      // Act
      const result = await templateLoader.getTemplateFromPath(filePath);
      
      // Assert
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(filePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(filePath);
      expect(result).toContain('Legacy content.');
    });
    
    it('should throw error if file not found', async () => {
      // Arrange
      const filePath = '/path/to/nonexistent-template.md';
      
      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);
      
      // Act & Assert
      await expect(templateLoader.getTemplateFromPath(filePath))
        .rejects.toThrow('Template file not found');
    });
  });
  
  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      // Arrange
      const templateId = 'test-template';
      
      // Act
      const result = await templateLoader.templateExists(templateId);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false if template does not exist', async () => {
      // Arrange
      const templateId = 'nonexistent-template';
      
      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);
      
      // Act
      const result = await templateLoader.templateExists(templateId);
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
