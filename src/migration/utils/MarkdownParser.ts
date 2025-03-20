/**
 * Markdown parser utility for migration
 *
 * Parses markdown content to extract metadata and content sections
 * similar to existing markdown-parser.ts but tailored for migration
 */
import crypto from 'crypto';
import { DocumentType } from '../../domain/entities/JsonDocument';

/**
 * Common structure for parsed markdown content
 */
export interface ParsedMarkdown {
  // Document metadata
  title: string;
  path: string;
  tags: string[];
  documentType: DocumentType;

  // Content sections
  content: Record<string, unknown>;
}

/**
 * Technical decision structure for system patterns
 */
export interface TechnicalDecision {
  title: string;
  context: string;
  decision: string;
  consequences: string[];
}

/**
 * Parse markdown document for migration to JSON
 * @param content Markdown content to parse
 * @param path Document path
 * @returns Parsed markdown structure
 */
export function parseMarkdownForMigration(content: string, path: string): ParsedMarkdown {
  // Initialize result
  const result: ParsedMarkdown = {
    title: '',
    path,
    tags: [],
    documentType: 'generic',
    content: {},
  };

  // Split content into lines
  const lines = content.split('\n');

  // Extract title from first H1 header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      result.title = line.substring(2).trim();
      break;
    }
  }

  // If no title found, use filename
  if (!result.title) {
    const filename = path.split('/').pop() || path;
    result.title = filename.replace(/\.(md|json)$/, '');
  }

  // Extract tags
  const tagsLine = lines.find((line) => line.trim().startsWith('tags:'));
  if (tagsLine) {
    const tagsMatch = tagsLine.match(/#([a-zA-Z0-9-_]+)/g);
    if (tagsMatch) {
      result.tags = tagsMatch.map((tag) => tag.substring(1)); // Remove # prefix
    }
  }

  // Determine document type based on the content or filename
  result.documentType = detectDocumentType(path, result.title);

  // Parse document content based on document type
  switch (result.documentType) {
    case 'branch_context':
      parseBranchContext(lines, result.content);
      break;
    case 'active_context':
      parseActiveContext(lines, result.content);
      break;
    case 'progress':
      parseProgress(lines, result.content);
      break;
    case 'system_patterns':
      parseSystemPatterns(lines, result.content);
      break;
    default:
      parseGenericDocument(lines, result.content);
      break;
  }

  return result;
}

/**
 * Detect document type from path and title
 * @param path Document path
 * @param title Document title
 * @returns Document type
 */
function detectDocumentType(path: string, title: string): DocumentType {
  const pathLower = path.toLowerCase();
  const titleLower = title.toLowerCase();

  // Check path for clues
  if (pathLower.includes('branchcontext') || pathLower.includes('branch-context')) {
    return 'branch_context';
  } else if (pathLower.includes('activecontext') || pathLower.includes('active-context')) {
    return 'active_context';
  } else if (pathLower.includes('progress')) {
    return 'progress';
  } else if (
    (pathLower.includes('systempatterns') || pathLower.includes('system-patterns')) &&
    titleLower.includes('技術的')
  ) {
    return 'system_patterns';
  }

  // Check title for clues
  if (titleLower.includes('branch context') || titleLower.includes('ブランチコンテキスト')) {
    return 'branch_context';
  } else if (
    titleLower.includes('active context') ||
    titleLower.includes('アクティブコンテキスト')
  ) {
    return 'active_context';
  } else if (titleLower.includes('progress') || titleLower.includes('進捗')) {
    return 'progress';
  } else if (
    (titleLower.includes('system patterns') || titleLower.includes('システムパターン')) &&
    titleLower.includes('技術的')
  ) {
    return 'system_patterns';
  }

  // Default to generic
  return 'generic';
}

/**
 * Parse branch context document sections
 */
function parseBranchContext(lines: string[], content: Record<string, unknown>): void {
  let inPurposeSection = false;
  let inUserStoriesSection = false;
  let purpose = '';
  const userStories: { description: string; completed: boolean }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for section headers
    if (line.startsWith('## 目的')) {
      inPurposeSection = true;
      inUserStoriesSection = false;
      continue;
    } else if (line.startsWith('## ユーザーストーリー')) {
      inPurposeSection = false;
      inUserStoriesSection = true;
      continue;
    } else if (line.startsWith('##')) {
      inPurposeSection = false;
      inUserStoriesSection = false;
      continue;
    }

    // Extract information
    if (inPurposeSection) {
      if (line.startsWith('ブランチ:')) {
        // Skip branch name line
      } else if (line.startsWith('作成日時:')) {
        // Extract creation date for metadata
      } else if (line) {
        purpose += line + '\n';
      }
    } else if (inUserStoriesSection) {
      // Look for challenge section
      if (line.startsWith('### 解決する課題')) {
        const challengesSection = extractListSection(lines, i + 1);
        content.challenges = challengesSection.items;
        i = challengesSection.endIndex - 1; // Skip processed lines
        continue;
      }

      // Look for features section
      if (line.startsWith('### 必要な機能')) {
        const featuresSection = extractListSection(lines, i + 1);
        content.features = featuresSection.items;
        i = featuresSection.endIndex - 1; // Skip processed lines
        continue;
      }

      // Look for expectations section
      if (line.startsWith('### 期待される動作')) {
        const expectationsSection = extractListSection(lines, i + 1);
        content.expectations = expectationsSection.items;
        i = expectationsSection.endIndex - 1; // Skip processed lines
        continue;
      }

      // Parse user story checkboxes if not in a specific subsection
      const storyMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/);
      if (storyMatch) {
        userStories.push({
          completed: storyMatch[1] === 'x',
          description: storyMatch[2].trim(),
        });
      }
    }
  }

  content.purpose = purpose.trim();
  content.userStories = userStories;
}

/**
 * Parse active context document sections
 */
function parseActiveContext(lines: string[], content: Record<string, unknown>): void {
  let currentSection = '';
  let currentWork = '';
  const recentChanges: string[] = [];
  const activeDecisions: string[] = [];
  const considerations: string[] = [];
  const nextSteps: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for section headers
    if (line.startsWith('## 現在の作業内容')) {
      currentSection = 'currentWork';
      continue;
    } else if (line.startsWith('## 直近の変更点')) {
      currentSection = 'recentChanges';
      continue;
    } else if (line.startsWith('## 今アクティブな決定事項')) {
      currentSection = 'activeDecisions';
      continue;
    } else if (line.startsWith('## 今アクティブな考慮点')) {
      currentSection = 'considerations';
      continue;
    } else if (line.startsWith('## 次のステップ')) {
      currentSection = 'nextSteps';
      continue;
    } else if (line.startsWith('##')) {
      currentSection = '';
      continue;
    }

    // Process content based on current section
    if (line && !line.startsWith('tags:')) {
      switch (currentSection) {
        case 'currentWork':
          if (!line.startsWith('_') && !line.endsWith('_')) {
            currentWork += line + '\n';
          }
          break;
        case 'recentChanges':
          if (line.startsWith('- ')) {
            recentChanges.push(line.substring(2).trim());
          }
          break;
        case 'activeDecisions':
          if (line.startsWith('- ')) {
            activeDecisions.push(line.substring(2).trim());
          }
          break;
        case 'considerations':
          if (line.startsWith('- ')) {
            considerations.push(line.substring(2).trim());
          }
          break;
        case 'nextSteps':
          if (line.startsWith('- ')) {
            nextSteps.push(line.substring(2).trim());
          }
          break;
      }
    }
  }

  content.currentWork = currentWork.trim();
  content.recentChanges = recentChanges;
  content.activeDecisions = activeDecisions;
  content.considerations = considerations;
  content.nextSteps = nextSteps;
}

/**
 * Parse progress document sections
 */
function parseProgress(lines: string[], content: Record<string, unknown>): void {
  let currentSection = '';
  let status = '';
  const workingFeatures: string[] = [];
  const pendingImplementation: string[] = [];
  const knownIssues: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for section headers
    if (line.startsWith('## 現時点で動作している部分') || line.startsWith('## 動作している機能')) {
      currentSection = 'workingFeatures';
      continue;
    } else if (line.startsWith('## 未実装の機能') || line.startsWith('## 残作業')) {
      currentSection = 'pendingImplementation';
      continue;
    } else if (line.startsWith('## 現在のステータス') || line.startsWith('## 現在の状態')) {
      currentSection = 'status';
      continue;
    } else if (line.startsWith('## 既知の問題')) {
      currentSection = 'knownIssues';
      continue;
    } else if (line.startsWith('##')) {
      currentSection = '';
      continue;
    }

    // Process content based on current section
    if (line && !line.startsWith('tags:')) {
      switch (currentSection) {
        case 'workingFeatures':
          if (line.startsWith('- ')) {
            workingFeatures.push(line.substring(2).trim());
          } else if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
            // Handle checklist format
            const match = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/);
            if (match) {
              workingFeatures.push(match[2].trim());
            }
          }
          break;
        case 'pendingImplementation':
          if (line.startsWith('- ')) {
            pendingImplementation.push(line.substring(2).trim());
          } else if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
            // Handle checklist format
            const match = line.match(/^\s*-\s*\[([ x])\]\s*(.+)$/);
            if (match) {
              pendingImplementation.push(match[2].trim());
            }
          }
          break;
        case 'status':
          if (!line.startsWith('_') && !line.endsWith('_')) {
            status += line + '\n';
          }
          break;
        case 'knownIssues':
          if (line.startsWith('- ')) {
            knownIssues.push(line.substring(2).trim());
          }
          break;
      }
    }
  }

  content.workingFeatures = workingFeatures;
  content.pendingImplementation = pendingImplementation;
  content.status = status.trim();
  content.knownIssues = knownIssues;
}

/**
 * Parse system patterns document
 */
function parseSystemPatterns(lines: string[], content: Record<string, unknown>): void {
  const technicalDecisions: TechnicalDecision[] = [];

  let currentDecision: TechnicalDecision | null = null;
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for technical decision header (H3 or bold with colon)
    if (line.startsWith('### ')) {
      // Save previous decision if exists
      if (currentDecision) {
        technicalDecisions.push(currentDecision);
      }

      // Start new decision
      currentDecision = {
        title: line.substring(4).trim(),
        context: '',
        decision: '',
        consequences: [],
      };
      currentSection = '';
      continue;
    }

    // Check for section headers (H4)
    // Support both H4 headers and bold with colon format
    if (
      line.startsWith('#### コンテキスト') ||
      line.startsWith('#### 背景') ||
      line.startsWith('**コンテキスト**:')
    ) {
      currentSection = 'context';
      continue;
    } else if (
      line.startsWith('#### 決定事項') ||
      line.startsWith('#### 判断') ||
      line.startsWith('#### 決定内容') ||
      line.startsWith('**決定事項**:')
    ) {
      currentSection = 'decision';
      continue;
    } else if (
      line.startsWith('#### 影響') ||
      line.startsWith('#### 理由') ||
      line.startsWith('#### 結果') ||
      line.startsWith('**結果**:')
    ) {
      currentSection = 'consequences';
      continue;
    } else if (line.startsWith('####') || line.match(/^\*\*.*\*\*:$/)) {
      currentSection = '';
      continue;
    }

    // Process content if we're in a decision
    if (currentDecision && line && !line.startsWith('##') && !line.startsWith('tags:')) {
      switch (currentSection) {
        case 'context':
          currentDecision.context += line + '\n';
          break;
        case 'decision':
          currentDecision.decision += line + '\n';
          break;
        case 'consequences':
          if (line.startsWith('- ')) {
            currentDecision.consequences.push(line.substring(2).trim());
          }
          break;
      }
    }
  }

  // Save last decision if exists
  if (currentDecision) {
    technicalDecisions.push(currentDecision);
  }

  // Trim multiline strings
  technicalDecisions.forEach((decision) => {
    decision.context = decision.context.trim();
    decision.decision = decision.decision.trim();
  });

  content.technicalDecisions = technicalDecisions;
}

/**
 * Parse generic document with sections
 */
function parseGenericDocument(lines: string[], content: Record<string, unknown>): void {
  let currentSection = '';
  let currentContent: string | string[] = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for section headers
    if (line.startsWith('## ')) {
      // Save previous section if exists
      if (currentSection && currentContent) {
        content[currentSection] = currentContent;
      }

      // Start new section
      currentSection = line
        .substring(3)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      currentContent = '';
      continue;
    }

    // Process content if in a section
    if (currentSection && line && !line.startsWith('#') && !line.startsWith('tags:')) {
      if (line.startsWith('- ')) {
        // Convert to array if it's a list item
        if (typeof currentContent === 'string') {
          if (currentContent.trim()) {
            // If we already have text, keep it as the first array item
            currentContent = [currentContent.trim()];
          } else {
            // Otherwise start a fresh array
            currentContent = [];
          }
        }
        // Add list item to array
        (currentContent as string[]).push(line.substring(2).trim());
      } else {
        // Append as text if not a list item
        if (Array.isArray(currentContent)) {
          // Convert back to string if this is no longer a list
          currentContent = currentContent.join('\n') + '\n' + line;
        } else {
          currentContent += line + '\n';
        }
      }
    }
  }

  // Save last section
  if (currentSection && currentContent) {
    if (typeof currentContent === 'string') {
      currentContent = currentContent.trim();
    }
    content[currentSection] = currentContent;
  }
}

/**
 * Helper function to extract a list section from markdown
 * Reads from startIndex until a non-list item is found
 */
function extractListSection(
  lines: string[],
  startIndex: number
): { items: string[]; endIndex: number } {
  const items: string[] = [];
  let i = startIndex;

  // Skip any empty lines
  while (i < lines.length && lines[i].trim() === '') {
    i++;
  }

  // Extract list items
  while (i < lines.length) {
    const line = lines[i].trim();

    // Stop if we hit a header or end of section
    if (line.startsWith('#') || line === '') {
      break;
    }

    // Extract list item
    if (line.startsWith('- ')) {
      items.push(line.substring(2).trim());
    }

    i++;
  }

  return { items, endIndex: i };
}
