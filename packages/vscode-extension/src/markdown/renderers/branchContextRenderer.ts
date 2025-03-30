import { MAX_ARRAY_ITEMS } from './common';
import { renderGenericContent } from './genericRenderer'; // Import generic renderer for fallback

/**
 * Renders content for 'branch_context' document type.
 */
export function renderBranchContextContent(content: any): string {
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
