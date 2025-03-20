/**
 * This is a mock version of the markdown-converter module for testing purposes.
 * It provides just enough implementation to make the tests pass.
 */

import {
  BranchContextJson,
  ActiveContextJson,
  ProgressJson,
  SystemPatternsJson,
  JsonDocument,
  BaseJsonDocument
} from '../../schemas/json-document';

/**
 * Convert JSON document to Markdown format
 * @param jsonDoc JSON document to convert
 * @returns Markdown string
 */
export function jsonToMarkdown(jsonDoc: JsonDocument | BaseJsonDocument): string {
  const { metadata, content } = jsonDoc;
  const title = metadata.title || 'Untitled Document';
  const tags = (metadata.tags || []).map(tag => `#${tag}`).join(' ');
  
  let markdown = `# ${title}\n\n`;
  
  // Add tags if present
  if (tags) {
    markdown += `tags: ${tags}\n\n`;
  }
  
  // Handle different document types
  switch (metadata.documentType) {
    case 'branch_context':
      markdown = handleBranchContext(markdown, jsonDoc as BranchContextJson);
      break;
    case 'active_context':
      markdown = handleActiveContext(markdown, jsonDoc as ActiveContextJson);
      break;
    case 'progress':
      markdown = handleProgress(markdown, jsonDoc as ProgressJson);
      break;
    case 'system_patterns':
      markdown = handleSystemPatterns(markdown, jsonDoc as SystemPatternsJson);
      break;
    default:
      markdown = handleGenericDocument(markdown, jsonDoc);
      break;
  }
  
  return markdown;
}

/**
 * Handle branch context document
 */
function handleBranchContext(markdown: string, doc: BranchContextJson): string {
  const { content } = doc;
  
  markdown += `## 目的\n\n`;
  markdown += `ブランチ: ${doc.metadata.path.replace('.json', '')}\n\n`;
  
  if (content.createdAt) {
    markdown += `作成日時: ${content.createdAt instanceof Date ? content.createdAt.toISOString() : content.createdAt}\n\n`;
  }
  
  markdown += `${content.purpose || '_目的はまだ定義されていません_'}\n\n`;
  
  // User stories
  markdown += `## ユーザーストーリー\n\n`;
  
  if (content.userStories && content.userStories.length > 0) {
    content.userStories.forEach(story => {
      markdown += `- [${story.completed ? 'x' : ' '}] ${story.description}\n`;
    });
  } else {
    markdown += `_ユーザーストーリーはまだ定義されていません_\n`;
  }
  
  return markdown;
}

/**
 * Handle active context document
 */
function handleActiveContext(markdown: string, doc: ActiveContextJson): string {
  const { content } = doc;
  
  // Current work
  markdown += `## 現在の作業内容\n\n`;
  markdown += content.currentWork || '_作業内容はまだ定義されていません_';
  markdown += '\n\n';
  
  // Recent changes
  markdown += `## 最近の変更点\n\n`;
  
  if (content.recentChanges && content.recentChanges.length > 0) {
    content.recentChanges.forEach(change => {
      markdown += `- ${change}\n`;
    });
  } else {
    markdown += `_変更点はまだ記録されていません_\n`;
  }
  markdown += '\n';
  
  // Active decisions
  markdown += `## アクティブな決定事項\n\n`;
  
  if (content.activeDecisions && content.activeDecisions.length > 0) {
    content.activeDecisions.forEach(decision => {
      markdown += `- ${decision}\n`;
    });
  } else {
    markdown += `_決定事項はまだ記録されていません_\n`;
  }
  markdown += '\n';
  
  // Considerations
  markdown += `## 検討事項\n\n`;
  
  if (content.considerations && content.considerations.length > 0) {
    content.considerations.forEach(consideration => {
      markdown += `- ${consideration}\n`;
    });
  } else {
    markdown += `_検討事項はまだ記録されていません_\n`;
  }
  markdown += '\n';
  
  // Next steps
  markdown += `## 次のステップ\n\n`;
  
  if (content.nextSteps && content.nextSteps.length > 0) {
    content.nextSteps.forEach(step => {
      markdown += `- ${step}\n`;
    });
  } else {
    markdown += `_次のステップはまだ定義されていません_\n`;
  }
  
  return markdown;
}

/**
 * Handle progress document
 */
function handleProgress(markdown: string, doc: ProgressJson): string {
  const { content } = doc;
  
  // Working features
  markdown += `## 動作している機能\n\n`;
  
  if (content.workingFeatures && content.workingFeatures.length > 0) {
    content.workingFeatures.forEach(feature => {
      markdown += `- ${feature}\n`;
    });
  } else {
    markdown += `_動作している機能はまだ記録されていません_\n`;
  }
  markdown += '\n';
  
  // Pending implementation
  markdown += `## 未実装の機能\n\n`;
  
  if (content.pendingImplementation && content.pendingImplementation.length > 0) {
    content.pendingImplementation.forEach(feature => {
      markdown += `- ${feature}\n`;
    });
  } else {
    markdown += `_未実装の機能はまだ記録されていません_\n`;
  }
  markdown += '\n';
  
  // Status
  markdown += `## 現在の状態\n\n`;
  markdown += content.status || '_状態はまだ定義されていません_';
  markdown += '\n\n';
  
  // Known issues
  markdown += `## 既知の問題\n\n`;
  
  if (content.knownIssues && content.knownIssues.length > 0) {
    content.knownIssues.forEach(issue => {
      markdown += `- ${issue}\n`;
    });
  } else {
    markdown += `_既知の問題はまだ記録されていません_\n`;
  }
  
  return markdown;
}

/**
 * Handle system patterns document
 */
function handleSystemPatterns(markdown: string, doc: SystemPatternsJson): string {
  const { content } = doc;
  
  // Technical decisions
  markdown += `## 技術的決定事項\n\n`;
  
  if (content.technicalDecisions && content.technicalDecisions.length > 0) {
    content.technicalDecisions.forEach(decision => {
      markdown += `### ${decision.title}\n\n`;
      
      markdown += `#### コンテキスト\n\n`;
      markdown += `${decision.context}\n\n`;
      
      markdown += `#### 決定事項\n\n`;
      markdown += `${decision.decision}\n\n`;
      
      markdown += `#### 影響\n\n`;
      
      if (decision.consequences && decision.consequences.length > 0) {
        decision.consequences.forEach(consequence => {
          markdown += `- ${consequence}\n`;
        });
      } else {
        markdown += `_影響はまだ記録されていません_\n`;
      }
      
      markdown += '\n';
    });
  } else {
    markdown += `_技術的決定事項はまだ記録されていません_\n`;
  }
  
  return markdown;
}

/**
 * Handle generic document type
 */
function handleGenericDocument(markdown: string, doc: BaseJsonDocument): string {
  const { content } = doc;
  
  // Handle each top-level field
  for (const [key, value] of Object.entries(content)) {
    // Convert camelCase or snake_case to Title Case
    const titleKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
    
    markdown += `## ${titleKey}\n\n`;
    
    // Handle different value types
    if (typeof value === 'string') {
      markdown += `${value}\n\n`;
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        value.forEach(item => {
          markdown += `- ${typeof item === 'string' ? item : JSON.stringify(item)}\n`;
        });
        markdown += '\n';
      } else {
        markdown += `_No items_\n\n`;
      }
    } else if (typeof value === 'object' && value !== null) {
      markdown += '```json\n';
      markdown += JSON.stringify(value, null, 2);
      markdown += '\n```\n\n';
    } else {
      markdown += `${value}\n\n`;
    }
  }
  
  return markdown;
}
