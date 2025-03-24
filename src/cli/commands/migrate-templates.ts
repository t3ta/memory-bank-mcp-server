/**
 * Migrate Templates Command
 * 
 * CLI command for migrating Markdown templates to JSON templates.
 * Also provides command for generating Markdown from JSON templates.
 */
import path from 'path';
import fs from 'fs/promises';
import { Command } from 'commander';
import { FileTemplateRepository } from '../../infrastructure/templates/FileTemplateRepository.js';
import { MarkdownMigrationService, MigrationOptions } from '../../migration/MarkdownMigrationService.js';
import { Language } from '../../domain/i18n/Language.js';

interface MigrateOptions {
  markdownDir?: string;
  outputDir?: string;
  backupDir?: string;
  force?: boolean;
  language?: string;
  reportPath?: string;
}

/**
 * Registers the migrate-templates command with the CLI
 * 
 * @param program Commander program instance
 * @param rootDir Root directory of the application
 */
export function registerMigrateTemplatesCommand(program: Command, rootDir: string): void {
  program
    .command('migrate-templates')
    .description('Migrate Markdown templates to JSON templates')
    .option('-m, --markdown-dir <dir>', 'Directory containing Markdown templates')
    .option('-o, --output-dir <dir>', 'Directory for storing JSON templates')
    .option('-b, --backup-dir <dir>', 'Directory for backing up original Markdown files')
    .option('-f, --force', 'Force migration of existing templates')
    .option('-l, --language <lang>', 'Language code for templates (default: en)')
    .option('-r, --report-path <path>', 'Path to save migration report')
    .action(async (options: MigrateOptions) => {
      try {
        // Set default directories
        const markdownDir = options.markdownDir 
          ? path.resolve(options.markdownDir)
          : path.join(rootDir, 'templates', 'markdown');
        
        const outputDir = options.outputDir
          ? path.resolve(options.outputDir)
          : path.join(rootDir, 'templates', 'json');
        
        const backupDir = options.backupDir
          ? path.resolve(options.backupDir)
          : path.join(rootDir, 'templates', 'backup');
        
        console.log('Migrating templates...');
        console.log(`From: ${markdownDir}`);
        console.log(`To: ${outputDir}`);
        console.log(`Backup: ${backupDir}`);
        console.log(`Force: ${options.force ? 'Yes' : 'No'}`);
        
        // Initialize repository
        const templateRepository = new FileTemplateRepository(outputDir);
        await templateRepository.initialize();
        
        // Initialize migration service
        const migrationService = new MarkdownMigrationService(
          templateRepository,
          markdownDir,
          backupDir
        );
        
        // Set migration options
        const migrationOptions: MigrationOptions = {
          force: options.force,
          defaultLanguage: (options.language || 'en') as any
        };
        
        // Perform migration
        const report = await migrationService.migrateAllTemplates(migrationOptions);
        const summary = report.getSummary();
        
        // Save report if requested
        if (options.reportPath) {
          const reportDir = path.dirname(options.reportPath);
          await fs.mkdir(reportDir, { recursive: true });
          await fs.writeFile(options.reportPath, report.toJSON(), 'utf-8');
          console.log(`Migration report saved to: ${options.reportPath}`);
        }
        
        console.log(`\nMigration complete.`);
        console.log(`Summary: ${summary.successful} migrated, ${summary.skipped} skipped, ${summary.failed} failed`);
      } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
      }
    });
    
  program
    .command('generate-markdown')
    .description('Generate Markdown files from JSON templates')
    .option('-t, --template-id <id>', 'Template ID to generate (all if not specified)')
    .option('-o, --output-dir <dir>', 'Directory for storing generated Markdown files')
    .option('-l, --language <lang>', 'Language code for templates (default: en)')
    .action(async (options: { templateId?: string, outputDir?: string, language?: string }) => {
      try {
        // Set default directories
        const jsonDir = path.join(rootDir, 'templates', 'json');
        
        const outputDir = options.outputDir
          ? path.resolve(options.outputDir)
          : path.join(rootDir, 'templates', 'generated');
        
        const languageCode = options.language || 'en';
        const language = new Language(languageCode);
        
        console.log('Generating Markdown from JSON templates...');
        console.log(`From: ${jsonDir}`);
        console.log(`To: ${outputDir}`);
        console.log(`Language: ${languageCode}`);
        
        // Initialize repository
        const templateRepository = new FileTemplateRepository(jsonDir);
        await templateRepository.initialize();
        
        // Initialize migration service
        const migrationService = new MarkdownMigrationService(
          templateRepository,
          '', // Not used for generation
          '' // Not used for generation
        );
        
        // Generate Markdown files
        if (options.templateId) {
          // Generate for a specific template
          const filePath = await migrationService.createMarkdownFile(
            options.templateId,
            language,
            outputDir
          );
          
          console.log(`Generated Markdown for template ${options.templateId}: ${filePath}`);
        } else {
          // Generate for all templates
          const templateIds = await templateRepository.getAllTemplateIds();
          
          for (const templateId of templateIds) {
            const filePath = await migrationService.createMarkdownFile(
              templateId,
              language,
              outputDir
            );
            
            console.log(`Generated Markdown for template ${templateId}: ${filePath}`);
          }
          
          console.log(`Generation complete. Generated ${templateIds.length} Markdown files.`);
        }
      } catch (error) {
        console.error('Markdown generation failed:', error);
        process.exit(1);
      }
    });
}
