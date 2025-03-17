import {
  JsonDocument,
  BaseJsonDocument,
  BranchContextJson,
  ActiveContextJson,
  ProgressJson,
  SystemPatternsJson,
  TechnicalDecisionContent,
} from '../../schemas/json-document.js';

/**
 * Convert a JSON document to Markdown format
 * @param document JSON document to convert
 * @returns Markdown formatted string
 */
export function jsonToMarkdown(document: JsonDocument | BaseJsonDocument): string {
  const { metadata } = document;

  // Basic metadata sections
  let markdown = `# ${metadata.title}\n\n`;

  // Add tags if present
  if (metadata.tags && metadata.tags.length > 0) {
    markdown += `tags: ${metadata.tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`;
  }

  // Select converter based on document type
  switch (metadata.documentType) {
    case 'branch_context':
      markdown += branchContextToMarkdown(document as BranchContextJson);
      break;
    case 'active_context':
      markdown += activeContextToMarkdown(document as ActiveContextJson);
      break;
    case 'progress':
      markdown += progressToMarkdown(document as ProgressJson);
      break;
    case 'system_patterns':
      markdown += systemPatternsToMarkdown(document as SystemPatternsJson);
      break;
    default:
      markdown += genericContentToMarkdown(document);
      break;
  }

  return markdown;
}

/**
 * Convert a branch context document to Markdown
 */
function branchContextToMarkdown(document: BranchContextJson): string {
  const { content } = document;
  let markdown = '';

  markdown += `## 目的\n\n`;
  markdown += `ブランチ: ${document.metadata.path.split('/').pop()?.replace('.json', '')}\n`;
  markdown += `作成日時: ${
    content.createdAt instanceof Date ? content.createdAt.toISOString() : content.createdAt
  }\n\n`;

  markdown += content.purpose ? `${content.purpose}\n\n` : '';

  markdown += `## ユーザーストーリー\n\n`;

  if (content.userStories && content.userStories.length > 0) {
    content.userStories.forEach((story) => {
      markdown += `- [${story.completed ? 'x' : ' '}] ${story.description}\n`;
    });
  } else {
    markdown += '_ユーザーストーリーはまだ定義されていません_\n';
  }

  return markdown;
}

/**
 * Convert an active context document to Markdown
 */
function activeContextToMarkdown(document: ActiveContextJson): string {
  const { content } = document;
  let markdown = '';

  markdown += `## 現在の作業内容\n\n`;
  markdown += content.currentWork
    ? `${content.currentWork}\n`
    : '_作業内容はまだ定義されていません_\n';
  markdown += '\n';

  markdown += `## 最近の変更点\n\n`;
  if (content.recentChanges && content.recentChanges.length > 0) {
    content.recentChanges.forEach((change) => {
      markdown += `- ${change}\n`;
    });
  } else {
    markdown += '_変更点はまだ記録されていません_\n';
  }
  markdown += '\n';

  markdown += `## アクティブな決定事項\n\n`;
  if (content.activeDecisions && content.activeDecisions.length > 0) {
    content.activeDecisions.forEach((decision) => {
      markdown += `- ${decision}\n`;
    });
  } else {
    markdown += '_アクティブな決定事項はまだありません_\n';
  }
  markdown += '\n';

  markdown += `## 検討事項\n\n`;
  if (content.considerations && content.considerations.length > 0) {
    content.considerations.forEach((consideration) => {
      markdown += `- ${consideration}\n`;
    });
  } else {
    markdown += '_検討事項はまだありません_\n';
  }
  markdown += '\n';

  markdown += `## 次のステップ\n\n`;
  if (content.nextSteps && content.nextSteps.length > 0) {
    content.nextSteps.forEach((step) => {
      markdown += `- ${step}\n`;
    });
  } else {
    markdown += '_次のステップはまだ定義されていません_\n';
  }

  return markdown;
}

/**
 * Convert a progress document to Markdown
 */
function progressToMarkdown(document: ProgressJson): string {
  const { content } = document;
  let markdown = '';

  markdown += `## 動作している機能\n\n`;
  if (content.workingFeatures && content.workingFeatures.length > 0) {
    content.workingFeatures.forEach((feature) => {
      markdown += `- ${feature}\n`;
    });
  } else {
    markdown += '_動作している機能はまだありません_\n';
  }
  markdown += '\n';

  markdown += `## 未実装の機能\n\n`;
  if (content.pendingImplementation && content.pendingImplementation.length > 0) {
    content.pendingImplementation.forEach((feature) => {
      markdown += `- ${feature}\n`;
    });
  } else {
    markdown += '_未実装の機能はありません_\n';
  }
  markdown += '\n';

  markdown += `## 現在の状態\n\n`;
  markdown += content.status ? `${content.status}\n` : '_状態は未定義です_\n';
  markdown += '\n';

  markdown += `## 既知の問題\n\n`;
  if (content.knownIssues && content.knownIssues.length > 0) {
    content.knownIssues.forEach((issue) => {
      markdown += `- ${issue}\n`;
    });
  } else {
    markdown += '_既知の問題はありません_\n';
  }

  return markdown;
}

/**
 * Convert a system patterns document to Markdown
 */
function systemPatternsToMarkdown(document: SystemPatternsJson): string {
  const { content } = document;
  let markdown = '';

  markdown += `## 技術的決定事項\n\n`;

  if (content.technicalDecisions && content.technicalDecisions.length > 0) {
    content.technicalDecisions.forEach((decision) => {
      markdown += technicalDecisionToMarkdown(decision);
    });
  } else {
    markdown += '_技術的決定事項はまだ記録されていません_\n';
  }

  return markdown;
}

/**
 * Convert a technical decision to Markdown
 */
function technicalDecisionToMarkdown(decision: TechnicalDecisionContent): string {
  let markdown = '';

  markdown += `### ${decision.title}\n\n`;

  markdown += `#### コンテキスト\n`;
  markdown += `${decision.context}\n\n`;

  markdown += `#### 決定事項\n`;
  markdown += `${decision.decision}\n\n`;

  markdown += `#### 影響\n`;
  decision.consequences.forEach((consequence) => {
    markdown += `- ${consequence}\n`;
  });
  markdown += '\n';

  return markdown;
}

/**
 * Generic content converter for unknown document types
 */
function genericContentToMarkdown(document: BaseJsonDocument): string {
  let markdown = '';

  // Try to handle generic content as a simple key-value structure
  const content = document.content as Record<string, unknown>;

  Object.entries(content).forEach(([key, value]) => {
    // Convert key from camelCase to Title Case for headers
    const headerText = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

    markdown += `## ${headerText}\n\n`;

    if (Array.isArray(value)) {
      value.forEach((item: unknown) => {
        if (typeof item === 'string') {
          markdown += `- ${item}\n`;
        } else if (typeof item === 'object' && item !== null) {
          markdown += `- ${JSON.stringify(item)}\n`;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      markdown += `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
    } else {
      markdown += `${value}\n`;
    }

    markdown += '\n';
  });

  return markdown;
}
