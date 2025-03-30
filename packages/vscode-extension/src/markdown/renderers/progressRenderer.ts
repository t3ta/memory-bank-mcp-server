import { MAX_ARRAY_ITEMS } from './common';
import { renderGenericContent } from './genericRenderer'; // Import generic renderer for fallback

/**
 * Renders content for 'progress' document type.
 */
export function renderProgressContent(content: any): string {
    console.log("[Renderer] Rendering 'progress' type");
    let mdString = '';
    try {
        if (!content || typeof content !== 'object') {
            return '_(Invalid or empty progress content)_';
        }

        if (content.status) {
          mdString += `**Status:** ${content.status}\n\n`;
        }
        if (content.completionPercentage !== undefined && typeof content.completionPercentage === 'number') {
          // Basic progress bar simulation
          const percentage = Math.max(0, Math.min(100, content.completionPercentage));
          const filledCount = Math.round(percentage / 10);
          const emptyCount = 10 - filledCount;
          mdString += `**Completion:** \`[${'#'.repeat(filledCount)}${'-'.repeat(emptyCount)}]\` ${percentage}%\n\n`;
        }

        if (Array.isArray(content.workingFeatures) && content.workingFeatures.length > 0) {
          mdString += `### Working Features\n`;
          const displayFeatures = content.workingFeatures.slice(0, MAX_ARRAY_ITEMS);
          const remainingFeatures = content.workingFeatures.length - displayFeatures.length;
          mdString += displayFeatures.map((feature: any) => {
              const status = feature.status || 'in-progress';
              const check = status === 'completed' ? '[x]' : '[ ]';
              return `- ${check} ${feature.description || feature.id || 'N/A'} _(${status})_`;
          }).join('\n');
          if (remainingFeatures > 0) {
              mdString += `\n- ... (${remainingFeatures} more features)`;
          }
          mdString += '\n\n';
        }

        if (Array.isArray(content.pendingImplementation) && content.pendingImplementation.length > 0) {
          mdString += `### Pending Implementation\n`;
          // Group by priority if available
          const grouped: { [key: string]: any[] } = {};
          content.pendingImplementation.forEach((item: any) => {
              const priority = item.priority || 'medium';
              if (!grouped[priority]) grouped[priority] = [];
              grouped[priority].push(item);
          });

          ['high', 'medium', 'low'].forEach(priority => {
              if (grouped[priority] && grouped[priority].length > 0) {
                  mdString += `**Priority: ${priority.toUpperCase()}**\n`;
                  const displayItems = grouped[priority].slice(0, MAX_ARRAY_ITEMS);
                  const remainingItems = grouped[priority].length - displayItems.length;
                  mdString += displayItems.map((item: any) => `- ${item.description || item.id || 'N/A'}`).join('\n');
                   if (remainingItems > 0) {
                      mdString += `\n- ... (${remainingItems} more items)`;
                  }
                  mdString += '\n'; // Add newline after each priority group list
              }
          });
           mdString += '\n'; // Add final newline after all priorities
        }

         if (Array.isArray(content.knownIssues) && content.knownIssues.length > 0) {
          mdString += `### Known Issues\n`;
          const displayIssues = content.knownIssues.slice(0, MAX_ARRAY_ITEMS);
          const remainingIssues = content.knownIssues.length - displayIssues.length;
          mdString += displayIssues.map((issue: any) => {
              let issueStr = `- **${issue.id || 'Issue'}:** ${issue.description || 'No description'} _(Status: ${issue.status || 'open'})_`;
              if (issue.solution) {
                  issueStr += `\n  - **Solution:** ${issue.solution}`;
              }
              return issueStr;
          }).join('\n\n'); // Keep double newline between issues for readability
          if (remainingIssues > 0) {
              mdString += `\n\n- ... (${remainingIssues} more issues)`; // Add double newline before "more items"
          }
          mdString += '\n\n';
        }

        // Add any other top-level keys from content using generic rendering as fallback
        const handledKeys = ['status', 'completionPercentage', 'workingFeatures', 'pendingImplementation', 'knownIssues'];
        const remainingContent: any = {};
        for (const key in content) {
            if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
                remainingContent[key] = content[key];
            }
        }
        if (Object.keys(remainingContent).length > 0) {
             mdString += `### Other Information\n\n`;
             mdString += renderGenericContent(remainingContent); // Use generic renderer for the rest
        }

        return mdString || '_(Progress content seems empty)_';
    } catch (error) {
        console.error(`[Renderer Error - progress] Failed to render progress content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (Progress)\n\nAn error occurred while rendering the progress content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}
