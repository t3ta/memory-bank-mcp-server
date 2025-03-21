// Backup script for meta information files
const fs = require('fs').promises;
const path = require('path');

async function backupFiles() {
  const sourceFiles = [
    {
      source: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/02-architecture/global-memory-bank-navigation.json',
      dest: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/backups/2025-03-21/meta-originals/global-memory-bank-navigation.json'
    },
    {
      source: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/02-architecture/global-memory-bank-reference.json',
      dest: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/backups/2025-03-21/meta-originals/global-memory-bank-reference.json'
    },
    {
      source: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/02-architecture/global-memory-bank-index-analysis.json',
      dest: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/backups/2025-03-21/meta-originals/global-memory-bank-index-analysis.json'
    },
    {
      source: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/02-architecture/global-memory-bank-indexing-mechanism.json',
      dest: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/backups/2025-03-21/meta-originals/global-memory-bank-indexing-mechanism.json'
    },
    {
      source: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/tags/reorganization-plan.json',
      dest: '/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/backups/2025-03-21/meta-originals/reorganization-plan.json'
    }
  ];

  // Backup each file
  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file.source, 'utf8');
      await fs.writeFile(file.dest, content, 'utf8');
      console.log(`Backed up ${path.basename(file.source)} successfully`);
    } catch (error) {
      console.error(`Error backing up ${path.basename(file.source)}:`, error.message);
    }
  }

  console.log('All backups completed!');
}

backupFiles().catch(err => {
  console.error('Backup failed:', err);
});
