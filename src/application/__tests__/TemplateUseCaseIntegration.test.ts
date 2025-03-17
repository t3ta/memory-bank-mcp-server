/**
 * Integration tests for template-related use cases
 */
import { IFileSystemService } from '../../infrastructure/storage/interfaces/IFileSystemService.js';
import { FileSystemService } from '../../infrastructure/storage/FileSystemService.js';
import { I18nProvider } from '../../infrastructure/i18n/I18nProvider.js';
import { II18nProvider } from '../../infrastructure/i18n/interfaces/II18nProvider.js';
import { JsonTemplateLoader } from '../../infrastructure/templates/JsonTemplateLoader.js';
import { ReadBranchDocumentUseCase } from '../usecases/branch/ReadBranchDocumentUseCase.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { MemoryDocument } from '../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { Tag } from '../../domain/entities/Tag.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

// Mock dependencies
jest.mock('../../infrastructure/storage/FileSystemService.js');
jest.mock('../../domain/repositories/IBranchMemoryBankRepository.js');

describe('Template Use Case Integration', () => {
  let fileSystemService: jest.Mocked<FileSystemService>;
  let i18nProvider: II18nProvider;
  let templateLoader: any; // 型のインターフェースがないのでanyを使用
  let branchRepository: jest.Mocked<IBranchMemoryBankRepository>;
  let readBranchDocumentUseCase: ReadBranchDocumentUseCase;

  // Sample template
  const pullRequestTemplate = {
    schema: 'template_v1',
    metadata: {
      id: 'pull-request-template',
      name: {
        en: 'Pull Request Template',
        ja: 'プルリクエストテンプレート',
      },
      type: 'pull-request',
      lastModified: '2025-03-17T00:00:00.000Z',
    },
    content: {
      sections: {
        overview: {
          title: {
            en: 'Overview',
            ja: '概要',
          },
          content: {
            en: '{{CURRENT_WORK}}',
            ja: '{{CURRENT_WORK}}',
          },
        },
        changes: {
          title: {
            en: 'Changes',
            ja: '変更内容',
          },
          content: {
            en: '{{RECENT_CHANGES}}',
            ja: '{{RECENT_CHANGES}}',
          },
          optional: true,
        },
      },
    },
  };

  // Sample document data
  const activeContextDocument = MemoryDocument.create({
    path: DocumentPath.create('activeContext.md'),
    content: `# アクティブコンテキスト

## 現在の作業内容

テスト実装中です。

## 最近の変更点

- 変更点1
- 変更点2
`,
    tags: [Tag.create('core'), Tag.create('active-context')],
    lastModified: new Date(),
  });

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Setup mocks
    fileSystemService = new FileSystemService() as jest.Mocked<FileSystemService>;

    fileSystemService.fileExists.mockImplementation((filePath: string) => {
      if (filePath.includes('pull-request-template.json')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    fileSystemService.readFile.mockImplementation((filePath: string) => {
      if (filePath.includes('pull-request-template.json')) {
        return Promise.resolve(JSON.stringify(pullRequestTemplate));
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Setup i18n provider mock
    i18nProvider = {
      translate: jest.fn((key, language, variables) => {
        // Simple mock implementation
        return key + (variables ? ` with ${Object.keys(variables).join(',')}` : '');
      }),
      getSupportedLanguages: jest.fn(() => ['en', 'ja', 'zh']),
      getDefaultLanguage: jest.fn(() => 'en'),
      loadTranslations: jest.fn().mockResolvedValue(true),
      isLanguageSupported: jest.fn(() => true),
    };

    // Setup template loader
    templateLoader = {
      getMarkdownTemplate: jest.fn().mockImplementation(async (templateId, language) => {
        if (language === 'ja') {
          return `# PRの作成

## 概要

{{CURRENT_WORK}}

## 変更内容

{{RECENT_CHANGES}}`;
        }
        return `# PR Creation

## Overview

{{CURRENT_WORK}}

## Changes

{{RECENT_CHANGES}}`;
      }),
      loadJsonTemplate: jest.fn(),
      loadLegacyTemplate: jest.fn(),
      templateExists: jest.fn().mockResolvedValue(true),
    } as any; // 仮のITemplateLoaderの代わりにanyを使用

    // Setup repository mock
    branchRepository = {
      exists: jest.fn().mockResolvedValue(true),
      getDocument: jest.fn().mockImplementation(async (branchInfo, path) => {
        if (path.value === 'activeContext.md') {
          return activeContextDocument;
        } else if (path.value === 'progress.md') {
          return MemoryDocument.create({
            path: DocumentPath.create('progress.md'),
            content: '# 進捗状況\n\n## 動作している機能\n\n- 機能1\n\n## 既知の問題\n\n- 問題なし',
            tags: [Tag.create('core'), Tag.create('progress')],
            lastModified: new Date(),
          });
        }
        return null;
      }),
      saveDocument: jest.fn().mockResolvedValue(undefined),
      deleteDocument: jest.fn().mockResolvedValue(true),
      listDocuments: jest
        .fn()
        .mockResolvedValue([
          DocumentPath.create('activeContext.md'),
          DocumentPath.create('progress.md'),
        ]),
      findDocumentsByTags: jest.fn().mockResolvedValue([activeContextDocument]),
      initialize: jest.fn().mockResolvedValue(undefined),
      validateStructure: jest.fn().mockResolvedValue(true),
      saveTagIndex: jest.fn().mockResolvedValue(undefined),
      findDocumentPathsByTagsUsingIndex: jest.fn().mockResolvedValue([]),
      getRecentBranches: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IBranchMemoryBankRepository>;
  });
});
