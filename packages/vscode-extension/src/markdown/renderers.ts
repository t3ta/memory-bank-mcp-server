/**
 * Functions to generate Markdown previews for different document types.
 */

/**
 * Generates a Markdown string from parsed JSON data based on its document type.
 * This is the main entry point for rendering.
 */
export function generateMarkdownFromData(data: any): string {
    if (!data || typeof data !== 'object') {
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    let mdString = '';
    const metadata = data.metadata || {};
    const content = data.content || {};
    const documentType = metadata.documentType || 'generic'; // Default to generic

    // --- Render Metadata ---
    mdString += `# ${metadata.title || 'Document'}\n\n`;
    mdString += `**ID:** ${metadata.id || 'N/A'}  \n`;
    mdString += `**Type:** \`${documentType}\`  \n`; // Display type prominently
    mdString += `**Path:** ${metadata.path || 'N/A'}  \n`;
    if (metadata.tags && Array.isArray(metadata.tags)) {
      mdString += `**Tags:** ${metadata.tags.map((tag: string) => `\`${tag}\``).join(', ')}  \n`;
    }
    mdString += `**Version:** ${metadata.version || 'N/A'}  \n`;
    mdString += `**Last Modified:** ${metadata.lastModified || 'N/A'}  \n`;
    mdString += `**Created At:** ${metadata.createdAt || 'N/A'}  \n\n`;
    mdString += '---\n\n';

    // --- Render Content based on Type ---
    mdString += `## Content\n\n`;

    switch (documentType) {
      case 'progress':
        mdString += renderProgressContent(content);
        break;
      case 'active_context':
        mdString += renderActiveContextContent(content);
        break;
      case 'branch_context':
        mdString += renderBranchContextContent(content);
        break;
      case 'system_patterns':
         mdString += renderSystemPatternsContent(content);
         break;
      // Add cases for other specific document types here
      case 'generic':
      case 'core': // Treat 'core' like 'generic' for now
      default:
        // Use the existing generic rendering logic for 'generic' or unknown types
        mdString += renderGenericContent(content);
        break;
    }

    return mdString;
}

// --- Type-Specific Rendering Functions ---

function renderGenericContent(content: any): string {
    let mdString = '';
    try {
        if (content && typeof content === 'object') {
            if (Array.isArray(content.sections)) {
                content.sections.forEach((section: any) => {
                    if (section && typeof section === 'object' && section.title && section.content) {
                        mdString += `### ${section.title}\n\n${section.content}\n\n`; // Use H3 for sections within content
                    }
                });
            } else {
                // Fallback: Iterate through content keys
                for (const key in content) {
                    if (Object.prototype.hasOwnProperty.call(content, key)) {
                        const value = content[key];
                        mdString += `### ${key}\n\n`;
                        if (typeof value === 'string') {
                            // Render multiline strings correctly
                            mdString += value.replace(/\n/g, '  \n') + '\n\n'; // Add double space for line breaks
                        } else if (Array.isArray(value)) {
                            const MAX_ARRAY_ITEMS = 10; // Limit array items displayed
                            const displayItems = value.slice(0, MAX_ARRAY_ITEMS);
                            const remainingItems = value.length - displayItems.length;

                            // Render arrays as lists or JSON blocks
                            if (displayItems.every(item => typeof item === 'string' || typeof item === 'number')) {
                                mdString += displayItems.map(item => `- ${item}`).join('\n');
                            } else {
                                mdString += displayItems.map(item => `- \`${JSON.stringify(item)}\``).join('\n');
                            }
                            if (remainingItems > 0) {
                                mdString += `\n- ... (${remainingItems} more items)`;
                            }
                            mdString += '\n\n'; // Add final newlines after list

                        } else if (typeof value === 'object' && value !== null) {
                            // For large objects, consider summarizing or limiting depth later if needed
                            mdString += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
                        } else {
                            mdString += `${String(value)}\n\n`;
                        }
                    }
                }
            }
        }
         if (!mdString) { // Handle empty content object or non-object content
             mdString = '_(No specific content found or content is not an object)_';
         }
        return mdString;
    } catch (error) {
        console.error(`[Renderer Error - generic] Failed to render generic content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Avoid stringifying potentially huge objects in the error message for generic content
        return `### Rendering Error (Generic)\n\nAn error occurred while rendering the generic content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n_(Original content omitted due to potential size)_`;
    }
}

function renderProgressContent(content: any): string {
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

        const MAX_ARRAY_ITEMS = 10; // Limit array items displayed

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

function renderActiveContextContent(content: any): string {
    console.log("[Renderer] Rendering 'active_context' type");
    let mdString = '';
    try {
        if (!content || typeof content !== 'object') {
            return '_(Invalid or empty active_context content)_';
        }

        if (content.currentWork) {
          mdString += `### Current Work\n**${content.currentWork}**\n\n`;
        }

        const MAX_ARRAY_ITEMS = 10; // Limit array items displayed

        if (Array.isArray(content.recentChanges) && content.recentChanges.length > 0) {
          mdString += `### Recent Changes\n`;
          // Sort by date descending if possible
          try {
              content.recentChanges.sort((a: any, b: any) => {
                  // Handle potential invalid dates
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
              });
          } catch (e) { console.warn("Could not sort recent changes by date", e); }

          const displayChanges = content.recentChanges.slice(0, MAX_ARRAY_ITEMS);
          const remainingChanges = content.recentChanges.length - displayChanges.length;
          mdString += displayChanges.map((change: any) => {
              let dateStr = '';
              try {
                  dateStr = change.date ? new Date(change.date).toLocaleString() : '';
              } catch (e) { /* ignore invalid date */ }
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
          mdString += displayDecisions.map((decision: any) =>
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
          mdString += displayConsiderations.map((item: any) =>
            `- ${item.description || item.id || 'N/A'} _(Status: ${item.status || 'open'})_`
          ).join('\n');
           if (remainingConsiderations > 0) {
              mdString += `\n- ... (${remainingConsiderations} more considerations)`;
          }
          mdString += '\n\n';
        }

        if (Array.isArray(content.nextSteps) && content.nextSteps.length > 0) {
           mdString += `### Next Steps\n`;
           // Group by priority if available
           const grouped: { [key: string]: any[] } = {};
           content.nextSteps.forEach((item: any) => {
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
            mdString += '\n';
        }

        // Add any other top-level keys using generic rendering
        const handledKeys = ['currentWork', 'recentChanges', 'activeDecisions', 'considerations', 'nextSteps'];
        const remainingContent: any = {};
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
        console.error(`[Renderer Error - active_context] Failed to render active context content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (Active Context)\n\nAn error occurred while rendering the active context content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}

function renderBranchContextContent(content: any): string {
    console.log("[Renderer] Rendering 'branch_context' type");
    let mdString = '';
    try {
        if (!content || typeof content !== 'object') {
            return '_(Invalid or empty branch_context content)_';
        }

        if (content.branchName) {
          mdString += `### Branch Name\n\`${content.branchName}\`\n\n`;
        }
        if (content.purpose) {
          mdString += `### Purpose\n${content.purpose.replace(/\n/g, '  \n')}\n\n`; // Handle multiline purpose
        }
         if (content.createdAt) {
            try {
                mdString += `**Created At:** ${new Date(content.createdAt).toLocaleString()}\n\n`;
            } catch(e) { /* ignore invalid date */ }
        }

        const MAX_ARRAY_ITEMS = 10; // Limit array items displayed

        if (Array.isArray(content.userStories) && content.userStories.length > 0) {
          mdString += `### User Stories\n`;
          // Sort by priority if available
          try {
              content.userStories.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
          } catch (e) { console.warn("Could not sort user stories by priority", e); }

          const displayStories = content.userStories.slice(0, MAX_ARRAY_ITEMS);
          const remainingStories = content.userStories.length - displayStories.length;
          mdString += displayStories.map((story: any) => {
              const check = story.completed ? '[x]' : '[ ]';
              let storyLine = `- ${check} **${story.id || 'Story'}:** ${story.description || 'N/A'}`;
              if (story.priority !== undefined) {
                  storyLine += ` _(Priority: ${story.priority})_`;
              }
              return storyLine;
          }).join('\n');
          if (remainingStories > 0) {
              mdString += `\n- ... (${remainingStories} more stories)`;
          }
          mdString += '\n\n';
        }

         if (content.additionalNotes) {
          mdString += `### Additional Notes\n${content.additionalNotes.replace(/\n/g, '  \n')}\n\n`; // Handle multiline notes
        }

        // Add any other top-level keys using generic rendering
        const handledKeys = ['branchName', 'purpose', 'createdAt', 'userStories', 'additionalNotes'];
        const remainingContent: any = {};
         for (const key in content) {
            if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
                remainingContent[key] = content[key];
            }
        }
        if (Object.keys(remainingContent).length > 0) {
             mdString += `### Other Information\n\n`;
             mdString += renderGenericContent(remainingContent);
        }

        return mdString || '_(Branch context content seems empty)_';
    } catch (error) {
        console.error(`[Renderer Error - branch_context] Failed to render branch context content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (Branch Context)\n\nAn error occurred while rendering the branch context content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}

function renderSystemPatternsContent(content: any): string {
    console.log("[Renderer] Rendering 'system_patterns' type");
    let mdString = '';
    try {
         if (!content || typeof content !== 'object') {
            return '_(Invalid or empty system_patterns content)_';
        }

        const MAX_ARRAY_ITEMS = 10; // Limit array items displayed

        if (Array.isArray(content.technicalDecisions) && content.technicalDecisions.length > 0) {
            mdString += `### Technical Decisions\n\n`;
            const displayDecisions = content.technicalDecisions.slice(0, MAX_ARRAY_ITEMS);
            const remainingDecisions = content.technicalDecisions.length - displayDecisions.length;

            displayDecisions.forEach((decision: any, index: number) => {
                mdString += `**${index + 1}. ${decision.title || decision.id || 'Decision'}**\n\n`; // Add extra newline
                if (decision.context) mdString += `   - **Context:**\n     ${decision.context.replace(/\n/g, '\n     ')}\n\n`; // Indent multiline
                if (decision.decision) mdString += `   - **Decision:**\n     ${decision.decision.replace(/\n/g, '\n     ')}\n\n`; // Indent multiline
                if (decision.status) mdString += `   - **Status:** ${decision.status}\n`;
                if (decision.date) {
                     try {
                        mdString += `   - **Date:** ${new Date(decision.date).toLocaleDateString()}\n`;
                     } catch(e) { /* ignore invalid date */ }
                }
                if (decision.consequences && typeof decision.consequences === 'object') {
                    if (Array.isArray(decision.consequences.positive) && decision.consequences.positive.length > 0) {
                        mdString += `   - **Positive Consequences:**\n` + decision.consequences.positive.map((p: string) => `     - ${p.replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure single line per consequence
                    }
                     if (Array.isArray(decision.consequences.negative) && decision.consequences.negative.length > 0) {
                        mdString += `   - **Negative Consequences:**\n` + decision.consequences.negative.map((n: string) => `     - ${n.replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure single line per consequence
                    }
                }
                 if (Array.isArray(decision.alternatives) && decision.alternatives.length > 0) {
                     mdString += `   - **Alternatives Considered:**\n` + decision.alternatives.map((alt: any) => `     - ${typeof alt === 'string' ? alt.replace(/\n/g, ' ') : JSON.stringify(alt)}`).join('\n') + '\n'; // Ensure single line per alternative
                  }
                 mdString += '\n---\n\n'; // Use separator between decisions
             });
             if (remainingDecisions > 0) {
                 mdString += `... (${remainingDecisions} more technical decisions)\n\n---\n\n`;
             }
         }

         if (Array.isArray(content.implementationPatterns) && content.implementationPatterns.length > 0) {
            mdString += `### Implementation Patterns\n\n`;
            const displayPatterns = content.implementationPatterns.slice(0, MAX_ARRAY_ITEMS);
            const remainingPatterns = content.implementationPatterns.length - displayPatterns.length;

             displayPatterns.forEach((pattern: any, index: number) => {
                 mdString += `**${index + 1}. ${pattern.name || pattern.id || 'Pattern'}**\n\n`; // Add extra newline
                 if (pattern.description) mdString += `   > ${pattern.description.replace(/\n/g, '\n   > ')}\n\n`; // Use blockquote for description
                 // Add more details if needed based on pattern structure
                 mdString += '\n';
             });
             if (remainingPatterns > 0) {
                 mdString += `... (${remainingPatterns} more implementation patterns)\n\n`;
             }
        }

        // Add any other top-level keys using generic rendering
        const handledKeys = ['technicalDecisions', 'implementationPatterns'];
        const remainingContent: any = {};
         for (const key in content) {
            if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
                remainingContent[key] = content[key];
            }
        }
        if (Object.keys(remainingContent).length > 0) {
             mdString += `### Other Information\n\n`;
             mdString += renderGenericContent(remainingContent);
        }


        return mdString || '_(System patterns content seems empty)_';
    } catch (error) {
        console.error(`[Renderer Error - system_patterns] Failed to render system patterns content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (System Patterns)\n\nAn error occurred while rendering the system patterns content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}
