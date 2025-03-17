/**
 * Tests for MarkdownToJsonConverter.ts
 */
import { MarkdownToJsonConverter } from '../MarkdownToJsonConverter.js';

describe('MarkdownToJsonConverter', () => {
  let converter: MarkdownToJsonConverter;

  // Sample markdown content
  const jaMarkdown = `## はじめに

これははじめにのセクションです。
複数行あります。

## 主要な内容

これが主な内容です。
詳細はここに書かれています。

## まとめ

要約として、これは重要なポイントです。`;

  const enMarkdown = `## Introduction

This is the introduction section.
It has multiple lines.

## Main Content

This is the main content.
Details are written here.

## Summary

In summary, this is the important point.`;

  beforeEach(() => {
    converter = new MarkdownToJsonConverter();
  });

  describe('convertMarkdownsToJsonTemplate', () => {
    it('should convert multiple language markdowns to a single JSON template', () => {
      // Arrange
      const templateId = 'test-template';
      const templateType = 'test';
      const languageContents = {
        ja: jaMarkdown,
        en: enMarkdown
      };
      const nameMap = {
        ja: 'テストテンプレート',
        en: 'Test Template'
      };

      // Act
      const result = converter.convertMarkdownsToJsonTemplate(
        templateId,
        templateType,
        languageContents,
        nameMap
      );

      // Assert
      // Check basic structure
      expect(result.schema).toBe('template_v1');
      expect(result.metadata.id).toBe(templateId);
      expect(result.metadata.type).toBe(templateType);
      expect(result.metadata.name).toEqual(nameMap);

      // Check sections - should be 6, 3 from each language
      // We now expect all sections to be included even if they have different names
      expect(Object.keys(result.content.sections).length).toBe(6);

      // Check that sections have correct mapping
      const introSection = result.content.sections['はじめに'] || result.content.sections['introduction'];
      expect(introSection).toBeDefined();
      expect(introSection.title.ja).toBe('はじめに');
      expect(introSection.title.en).toBe('Introduction');
      expect(introSection.content?.ja).toContain('これははじめにのセクション');
      expect(introSection.content?.en).toContain('This is the introduction section');

      const summarySection = result.content.sections['まとめ'] || result.content.sections['summary'];
      expect(summarySection).toBeDefined();
      expect(summarySection.title.ja).toBe('まとめ');
      expect(summarySection.title.en).toBe('Summary');
      expect(summarySection.content?.ja).toContain('要約として');
      expect(summarySection.content?.en).toContain('In summary');
    });

    it('should handle sections that exist in only one language', () => {
      // Arrange
      const jaMarkdownWithExtra = jaMarkdown + `\n\n## 追加セクション\n\nこれは日本語だけのセクションです。`;
      const languageContents = {
        ja: jaMarkdownWithExtra,
        en: enMarkdown
      };

      // Act
      const result = converter.convertMarkdownsToJsonTemplate(
        'test',
        'test',
        languageContents,
        { ja: 'テスト', en: 'Test' }
      );

      // Assert
      const extraSection = result.content.sections['追加セクション'] || result.content.sections['additionalSection'];
      expect(extraSection).toBeDefined();
      expect(extraSection.title.ja).toBe('追加セクション');
      expect(extraSection.content?.ja).toContain('これは日本語だけのセクション');
      expect(extraSection.title.en).toBeUndefined();
      // オプショナルチェーンを使ってsafeにアクセス
      expect(extraSection.content?.en).toBeUndefined();
      expect(extraSection.optional).toBe(true); // Should be optional since it's not in all languages
    });
  });

  describe('findPlaceholders', () => {
    it('should find all placeholders in markdown content', () => {
      // Arrange
      const markdownWithPlaceholders = `# Template with Placeholders

## Section One

Replace {{TITLE}} with actual title.

## Section Two

Replace {{CONTENT}} with actual content and {{DATE}} with the current date.`;

      // Act
      const placeholders = converter.findPlaceholders(markdownWithPlaceholders);

      // Assert
      expect(Object.keys(placeholders).length).toBe(3);
      expect(placeholders['TITLE']).toBe('');
      expect(placeholders['CONTENT']).toBe('');
      expect(placeholders['DATE']).toBe('');
    });

    it('should return empty object when no placeholders found', () => {
      // Arrange
      const markdownWithoutPlaceholders = `# Template without Placeholders

## Section One

This has no placeholders.

## Section Two

This also has no placeholders.`;

      // Act
      const placeholders = converter.findPlaceholders(markdownWithoutPlaceholders);

      // Assert
      expect(Object.keys(placeholders).length).toBe(0);
    });
  });
});
