import { DocumentMetadataV2 as DocumentMetadata } from '../../schemas/v2/json-document.js';
import crypto from 'crypto';

/**
 * Parse markdown document to extract metadata and content sections
 * @param content Markdown content to parse
 * @param path Document path
 * @returns Object with metadata and structured content
 */
export interface SystemPatternsTechnicalDecision {
  title: string;
  context: string;
  decision: string;
  consequences: string[];
}

export interface ParsedMarkdownContent {
  // Branch context
  purpose?: string;
  userStories?: Array<{ description: string; completed: boolean }>;

  // Active context
  currentWork?: string;
  recentChanges?: string[];
  activeDecisions?: string[];
  considerations?: string[];
  nextSteps?: string[];

  // Progress
  workingFeatures?: string[];
  pendingImplementation?: string[];
  status?: string;
  knownIssues?: string[];

  // System patterns
  technicalDecisions?: SystemPatternsTechnicalDecision[];

  // Generic sections
  [key: string]: unknown;
}

export function parseMarkdown(
  content: string,
  path: string
): {
  metadata: DocumentMetadata;
  content: ParsedMarkdownContent;
} {
  // Initialize result
  const result: {
    metadata: Partial<DocumentMetadata>;
    content: Record<string, unknown>;
  } = {
    metadata: {
      path,
      tags: [],
      lastModified: new Date(),
      id: crypto.randomUUID(), // Add ID for v2 schema
      createdAt: new Date(), // Add createdAt for v2 schema
      version: 1, // Add version for v2 schema
    },
    content: {},
  };

  // Split content into lines
  const lines = content.split('\n');

  // Extract title from first H1 header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      result.metadata.title = line.substring(2).trim();
      break;
    }
  }

  // If no title found, use filename
  if (!result.metadata.title) {
    const filename = path.split('/').pop() || path;
    result.metadata.title = filename.replace(/\.(md|json)$/, '');
  }

  // Extract tags
  const tagsLine = lines.find((line) => line.trim().startsWith('tags:'));
  if (tagsLine) {
    const tagsMatch = tagsLine.match(/#([a-z0-9-]+)/g);
    if (tagsMatch) {
      result.metadata.tags = tagsMatch.map((tag) => tag.substring(1)); // Remove # prefix
    }
  }

  // Determine document type based on the content or filename
  const filename = path.toLowerCase();
  if (filename.includes('branchcontext') || filename.includes('branch-context')) {
    result.metadata.documentType = 'branch_context';
    parseBranchContext(lines, result.content);
  } else if (filename.includes('activecontext') || filename.includes('active-context')) {
    result.metadata.documentType = 'active_context';
    parseActiveContext(lines, result.content);
  } else if (filename.includes('progress')) {
    result.metadata.documentType = 'progress';
    parseProgress(lines, result.content);
  } else if (filename.includes('systempatterns') || filename.includes('system-patterns')) {
    result.metadata.documentType = 'system_patterns';
    parseSystemPatterns(lines, result.content);
  } else {
    // Default to generic document
    result.metadata.documentType = 'generic';
    parseGenericDocument(lines, result.content);
  }
  return result as { metadata: DocumentMetadata; content: ParsedMarkdownContent };
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
        content.createdAt = line.substring('作成日時:'.length).trim();
      } else if (line) {
        purpose += line + '\n';
      }
    } else if (inUserStoriesSection) {
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
    } else if (line.startsWith('## 最近の変更点')) {
      currentSection = 'recentChanges';
      continue;
    } else if (line.startsWith('## アクティブな決定事項')) {
      currentSection = 'activeDecisions';
      continue;
    } else if (line.startsWith('## 検討事項')) {
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
    if (line.startsWith('## 動作している機能')) {
      currentSection = 'workingFeatures';
      continue;
    } else if (line.startsWith('## 未実装の機能')) {
      currentSection = 'pendingImplementation';
      continue;
    } else if (line.startsWith('## 現在の状態')) {
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
          }
          break;
        case 'pendingImplementation':
          if (line.startsWith('- ')) {
            pendingImplementation.push(line.substring(2).trim());
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
  const technicalDecisions: {
    title: string;
    context: string;
    decision: string;
    consequences: string[];
  }[] = [];

  let currentDecision: {
    title: string;
    context: string;
    decision: string;
    consequences: string[];
  } | null = null;

  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for technical decision header (H3)
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
    if (line.startsWith('#### コンテキスト')) {
      currentSection = 'context';
      continue;
    } else if (line.startsWith('#### 決定事項')) {
      currentSection = 'decision';
      continue;
    } else if (line.startsWith('#### 影響')) {
      currentSection = 'consequences';
      continue;
    } else if (line.startsWith('####')) {
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
