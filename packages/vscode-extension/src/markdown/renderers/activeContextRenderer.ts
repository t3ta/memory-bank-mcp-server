import * as vscode from 'vscode';
import { MAX_ARRAY_ITEMS } from './common';
import { renderGenericContent } from './genericRenderer';

/**
 * Renders content for 'active_context' document type.
 */
export function renderActiveContextContent(content: Record<string, unknown>): string {
    vscode.window.showInformationMessage("[Renderer] Rendering 'active_context' type");
    let mdString = '';
    try {
        if (!content || typeof content !== 'object') {
            return '_(Invalid or empty active_context content)_';
        }

        if (content.currentWork) {
          mdString += `### Current Work\n**${content.currentWork}**\n\n`;
        }

        // const MAX_ARRAY_ITEMS = 10; // Defined in common.ts

        if (Array.isArray(content.recentChanges) && content.recentChanges.length > 0) {
          mdString += `### Recent Changes\n`;
          try {
              content.recentChanges.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
              });
          } catch (_error) { vscode.window.showWarningMessage("Could not sort recent changes by date"); }

          const displayChanges = content.recentChanges.slice(0, MAX_ARRAY_ITEMS);
          const remainingChanges = content.recentChanges.length - displayChanges.length;
          mdString += displayChanges.map((change: Record<string, unknown>) => {
              let dateStr = '';
              try {
                  dateStr = change.date ? new Date(change.date).toLocaleString() : '';
              } catch { /* ignore */ }
              return `- **${dateStr || (change.id || 'Change')}:** ${change.description || 'N/A'}`;
          }).join('\n');
          if (remainingChanges > 0) {
              mdString += `\n- ... (${remainingChanges} more changes)`;
          }
          mdString += '\n\n';
        }

        if (Array.isArray(content.activeDecisions) && content.activeDecisions.length > 0) {
          mdString += `### Active Decisions\n`;
          const displayDecisions = content.activeDecisions.slice(0, MAX_ARRAY_ITEMS);
          const remainingDecisions = content.activeDecisions.length - displayDecisions.length;
          mdString += displayDecisions.map((decision: Record<string, unknown>) =>
            `- ${decision.description || decision.id || 'N/A'}`
          ).join('\n');
          if (remainingDecisions > 0) {
              mdString += `\n- ... (${remainingDecisions} more decisions)`;
          }
          mdString += '\n\n';
        }

        if (Array.isArray(content.considerations) && content.considerations.length > 0) {
          mdString += `### Considerations\n`;
          const displayConsiderations = content.considerations.slice(0, MAX_ARRAY_ITEMS);
          const remainingConsiderations = content.considerations.length - displayConsiderations.length;
          mdString += displayConsiderations.map((item: Record<string, unknown>) =>
            `- ${item.description || item.id || 'N/A'} _(Status: ${item.status || 'open'})_`
          ).join('\n');
           if (remainingConsiderations > 0) {
              mdString += `\n- ... (${remainingConsiderations} more considerations)`;
          }
          mdString += '\n\n';
        }

        if (Array.isArray(content.nextSteps) && content.nextSteps.length > 0) {
           mdString += `### Next Steps\n`;
           const grouped: { [key: string]: Record<string, unknown>[] } = {};
           content.nextSteps.forEach((item: Record<string, unknown>) => {
               const priority = item.priority || 'medium';
               if (!grouped[priority]) grouped[priority] = [];
               grouped[priority].push(item);
           });

           ['high', 'medium', 'low'].forEach(priority => {
               if (grouped[priority] && grouped[priority].length > 0) {
                   mdString += `**Priority: ${priority.toUpperCase()}**\n`;
                   const displayItems = grouped[priority].slice(0, MAX_ARRAY_ITEMS);
                   const remainingItems = grouped[priority].length - displayItems.length;
                   mdString += displayItems.map((item: Record<string, unknown>) => `- ${item.description || item.id || 'N/A'}`).join('\n');
                   if (remainingItems > 0) {
                       mdString += `\n- ... (${remainingItems} more items)`;
                   }
                   mdString += '\n';
               }
           });
            mdString += '\n';
        }

        const handledKeys = ['currentWork', 'recentChanges', 'activeDecisions', 'considerations', 'nextSteps'];
        const remainingContent: Record<string, unknown> = {};
         for (const key in content) {
            if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
                remainingContent[key] = content[key];
            }
        }
        if (Object.keys(remainingContent).length > 0) {
             mdString += `### Other Information\n\n`;
             mdString += renderGenericContent(remainingContent);
        }

        return mdString || '_(Active context content seems empty)_';
    } catch (error) {
        vscode.window.showErrorMessage(`[Renderer Error - active_context] Failed to render active context content: ${error instanceof Error ? error.message : String(error)}`);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (Active Context)\n\nAn error occurred while rendering the active context content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}
