import { jsonToMarkdown } from '../markdown-converter.js';
import {
  BranchContextJson,
  ActiveContextJson,
  ProgressJson,
  SystemPatternsJson,
  JsonDocument,
  BaseJsonDocument
} from '../../../schemas/json-document.js';

describe('markdown-converter', () => {
  describe('jsonToMarkdown', () => {
    it('should convert branch context document to markdown', () => {
      // Arrange
      const jsonDoc: BranchContextJson = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Branch Context',
          documentType: 'branch_context',
          path: 'branchContext.json',
          tags: ['branch', 'context'],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          purpose: 'This is a test branch for JSON support.',
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          userStories: [
            { description: 'Implement JSON support', completed: false },
            { description: 'Write tests', completed: true }
          ]
        }
      };

      // Act
      const markdown = jsonToMarkdown(jsonDoc as JsonDocument);

      // Assert
      expect(markdown).toContain('# Branch Context');
      expect(markdown).toContain('tags: #branch #context');
      expect(markdown).toContain('## 目的');
      expect(markdown).toContain('ブランチ: branchContext');
      expect(markdown).toContain('作成日時: 2023-01-01T00:00:00.000Z');
      expect(markdown).toContain('This is a test branch for JSON support.');
      expect(markdown).toContain('## ユーザーストーリー');
      expect(markdown).toContain('- [ ] Implement JSON support');
      expect(markdown).toContain('- [x] Write tests');
    });

    it('should convert active context document to markdown', () => {
      // Arrange
      const jsonDoc: ActiveContextJson = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Active Context',
          documentType: 'active_context',
          path: 'activeContext.json',
          tags: ['active', 'context'],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          currentWork: 'Working on JSON conversion',
          recentChanges: ['Added JSON schema', 'Implemented converter'],
          activeDecisions: ['Use JSON as primary format', 'Generate Markdown views'],
          considerations: ['Performance for large documents', 'Synchronization issues'],
          nextSteps: ['Implement more tests', 'Document the approach']
        }
      };

      // Act
      const markdown = jsonToMarkdown(jsonDoc as JsonDocument);

      // Assert
      expect(markdown).toContain('# Active Context');
      expect(markdown).toContain('tags: #active #context');
      expect(markdown).toContain('## 現在の作業内容');
      expect(markdown).toContain('Working on JSON conversion');
      expect(markdown).toContain('## 最近の変更点');
      expect(markdown).toContain('- Added JSON schema');
      expect(markdown).toContain('- Implemented converter');
      expect(markdown).toContain('## アクティブな決定事項');
      expect(markdown).toContain('- Use JSON as primary format');
      expect(markdown).toContain('- Generate Markdown views');
      expect(markdown).toContain('## 検討事項');
      expect(markdown).toContain('- Performance for large documents');
      expect(markdown).toContain('- Synchronization issues');
      expect(markdown).toContain('## 次のステップ');
      expect(markdown).toContain('- Implement more tests');
      expect(markdown).toContain('- Document the approach');
    });

    it('should convert progress document to markdown', () => {
      // Arrange
      const jsonDoc: ProgressJson = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Progress',
          documentType: 'progress',
          path: 'progress.json',
          tags: ['progress', 'status'],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          workingFeatures: ['JSON schema definition', 'Basic conversion'],
          pendingImplementation: ['Advanced validation', 'Search optimization'],
          status: 'In development',
          knownIssues: ['Complex document structure handling', 'Performance with large files']
        }
      };

      // Act
      const markdown = jsonToMarkdown(jsonDoc as JsonDocument);

      // Assert
      expect(markdown).toContain('# Progress');
      expect(markdown).toContain('tags: #progress #status');
      expect(markdown).toContain('## 動作している機能');
      expect(markdown).toContain('- JSON schema definition');
      expect(markdown).toContain('- Basic conversion');
      expect(markdown).toContain('## 未実装の機能');
      expect(markdown).toContain('- Advanced validation');
      expect(markdown).toContain('- Search optimization');
      expect(markdown).toContain('## 現在の状態');
      expect(markdown).toContain('In development');
      expect(markdown).toContain('## 既知の問題');
      expect(markdown).toContain('- Complex document structure handling');
      expect(markdown).toContain('- Performance with large files');
    });

    it('should convert system patterns document to markdown', () => {
      // Arrange
      const jsonDoc: SystemPatternsJson = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'System Patterns',
          documentType: 'system_patterns',
          path: 'systemPatterns.json',
          tags: ['system', 'patterns'],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          technicalDecisions: [
            {
              title: 'JSON as Primary Format',
              context: 'Need a more structured format than Markdown for data storage',
              decision: 'Use JSON as primary storage format with Markdown as presentation',
              consequences: [
                'Better structured data',
                'Easier to validate',
                'More complex implementation'
              ]
            },
            {
              title: 'Bidirectional Conversion',
              context: 'Need to support both formats for backward compatibility',
              decision: 'Implement bidirectional conversion between JSON and Markdown',
              consequences: [
                'Maintains compatibility',
                'Increases code complexity',
                'Potential synchronization issues'
              ]
            }
          ]
        }
      };

      // Act
      const markdown = jsonToMarkdown(jsonDoc as JsonDocument);

      // Assert
      expect(markdown).toContain('# System Patterns');
      expect(markdown).toContain('tags: #system #patterns');
      expect(markdown).toContain('## 技術的決定事項');
      expect(markdown).toContain('### JSON as Primary Format');
      expect(markdown).toContain('#### コンテキスト');
      expect(markdown).toContain('Need a more structured format than Markdown for data storage');
      expect(markdown).toContain('#### 決定事項');
      expect(markdown).toContain('Use JSON as primary storage format with Markdown as presentation');
      expect(markdown).toContain('#### 影響');
      expect(markdown).toContain('- Better structured data');
      expect(markdown).toContain('- Easier to validate');
      expect(markdown).toContain('- More complex implementation');
      expect(markdown).toContain('### Bidirectional Conversion');
    });

    it('should handle empty arrays gracefully', () => {
      // Arrange
      const jsonDoc: ActiveContextJson = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Empty Active Context',
          documentType: 'active_context',
          path: 'emptyActiveContext.json',
          tags: [],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          currentWork: '',
          recentChanges: [],
          activeDecisions: [],
          considerations: [],
          nextSteps: []
        }
      };

      // Act
      const markdown = jsonToMarkdown(jsonDoc as JsonDocument);

      // Assert
      expect(markdown).toContain('# Empty Active Context');
      expect(markdown).toContain('## 現在の作業内容');
      expect(markdown).toContain('_作業内容はまだ定義されていません_');
      expect(markdown).toContain('## 最近の変更点');
      expect(markdown).toContain('_変更点はまだ記録されていません_');
    });

    it('should handle unknown document types gracefully', () => {
      // Arrange
      const jsonDoc = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Unknown Document',
          documentType: 'unknown_type',
          path: 'unknown.json',
          tags: ['unknown'],
          lastModified: new Date('2023-01-01T00:00:00.000Z')
        },
        content: {
          someField: 'Some value',
          listField: ['Item 1', 'Item 2'],
          nestedField: {
            subField: 'Nested value'
          }
        }
      };

      // Act
      // 型互換性の問題を解決するため、まずunknownにキャストしてからJsonDocumentにキャスト
      const markdown = jsonToMarkdown(jsonDoc as unknown as BaseJsonDocument);

      // Assert
      expect(markdown).toContain('# Unknown Document');
      expect(markdown).toContain('tags: #unknown');
      expect(markdown).toContain('## Some Field');
      expect(markdown).toContain('Some value');
      // JSON should be formatted for nested objects
      expect(markdown).toContain('```json');
    });
  });
});
