/**
 * MigrateTemplatesCommand.ts
 * Command to migrate Markdown templates to JSON format
 */
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';
import path from 'path';
import chalk from 'chalk';
import { Argv } from 'yargs';
import { MarkdownToJsonConverter } from '../../../infrastructure/templates/MarkdownToJsonConverter.js';
import { IFileSystemService } from '../../../infrastructure/storage/interfaces/IFileSystemService.js';
import { IConfigProvider } from '../../../infrastructure/config/interfaces/IConfigProvider.js';
import { Language } from '../../../schemas/v2/i18n-schema.js';

interface TemplateMapping {
  id: string;
  type: string;
  names: Record<Language, string>;
  descriptions?: Record<Language, string>;
  legacyPaths: Record<Language, string>;
}

/**
 * Command to migrate Markdown templates to JSON format
 */
@injectable()
export class MigrateTemplatesCommand {
  // Template mappings for known templates
  private readonly templateMappings: TemplateMapping[] = [
    {
      id: 'pull-request-template',
      type: 'pull-request',
      names: {
        ja: 'プルリクエストテンプレート',
        en: 'Pull Request Template',
        zh: 'Pull Request Template'
      },
      descriptions: {
        ja: 'ブランチのメモリバンク情報に基づいてプルリクエストを生成するためのテンプレート',
        en: 'Template for generating pull requests based on branch memory bank information',
        zh: 'Template for generating pull requests based on branch memory bank information'
      },
      legacyPaths: {
        ja: 'pull-request-template.md',
        en: 'pull-request-template-en.md',
        zh: 'pull-request-template-en.md'
      }
    },
    {
      id: 'develop-to-master-pr-template',
      type: 'pull-request',
      names: {
        ja: '開発から本番へのプルリクエストテンプレート',
        en: 'Develop to Master Pull Request Template',
        zh: 'Develop to Master Pull Request Template'
      },
      descriptions: {
        ja: '開発ブランチから本番ブランチへのプルリクエストを生成するためのテンプレート',
        en: 'Template for generating pull requests from develop to master branch',
        zh: 'Template for generating pull requests from develop to master branch'
      },
      legacyPaths: {
        ja: 'develop-to-master-pr-template.md',
        en: 'develop-to-master-pr-template-en.md',
        zh: 'develop-to-master-pr-template-en.md'
      }
    },
    {
      id: 'branch-context-template',
      type: 'branch-memory',
      names: {
        ja: 'ブランチコンテキストテンプレート',
        en: 'Branch Context Template',
        zh: 'Branch Context Template'
      },
      descriptions: {
        ja: 'ブランチの目的や背景情報を記録するためのテンプレート',
        en: 'Template for documenting the purpose and background of a branch',
        zh: 'Template for documenting the purpose and background of a branch'
      },
      legacyPaths: {
        ja: 'branch-context-template.md',
        en: 'branch-context-template-en.md',
        zh: 'branch-context-template-en.md'
      }
    },
    {
      id: 'active-context-template',
      type: 'branch-memory',
      names: {
        ja: 'アクティブコンテキストテンプレート',
        en: 'Active Context Template',
        zh: 'Active Context Template'
      },
      descriptions: {
        ja: '現在の作業状況や最近の変更点を記録するためのテンプレート',
        en: 'Template for documenting current work status and recent changes',
        zh: 'Template for documenting current work status and recent changes'
      },
      legacyPaths: {
        ja: 'active-context-template.md',
        en: 'active-context-template-en.md',
        zh: 'active-context-template-en.md'
      }
    },
    {
      id: 'system-patterns-template',
      type: 'system',
      names: {
        ja: 'システムパターンテンプレート',
        en: 'System Patterns Template',
        zh: 'System Patterns Template'
      },
      descriptions: {
        ja: '技術的決定事項やアーキテクチャパターンを記録するためのテンプレート',
        en: 'Template for documenting technical decisions and architectural patterns',
        zh: 'Template for documenting technical decisions and architectural patterns'
      },
      legacyPaths: {
        ja: 'system-patterns-template.md',
        en: 'system-patterns-template-en.md',
        zh: 'system-patterns-template-en.md'
      }
    },
    {
      id: 'progress-template',
      type: 'branch-memory',
      names: {
        ja: '進捗状況テンプレート',
        en: 'Progress Template',
        zh: 'Progress Template'
      },
      descriptions: {
        ja: '機能の実装状況や残作業を記録するためのテンプレート',
        en: 'Template for documenting feature implementation status and remaining work',
        zh: 'Template for documenting feature implementation status and remaining work'
      },
      legacyPaths: {
        ja: 'progress-template.md',
        en: 'progress-template-en.md',
        zh: 'progress-template-en.md'
      }
    },
    {
      id: 'rules-template',
      type: 'system',
      names: {
        ja: 'メモリーバンクのルール',
        en: 'Memory Bank Rules',
        zh: 'Memory Bank Rules'
      },
      descriptions: {
        ja: 'メモリーバンクの使用ルールと構造に関する説明',
        en: 'Explanation of memory bank usage rules and structure',
        zh: 'Explanation of memory bank usage rules and structure'
      },
      legacyPaths: {
        ja: 'rules.md',
        en: 'rules-en.md',
        zh: 'rules-en.md'
      }
    }
  ];

  private readonly jsonTemplateDir = 'templates/json';
  private readonly legacyTemplateDir = 'templates';

  /**
   * Constructor
   */
  constructor(
    @inject('MarkdownToJsonConverter') private readonly converter: MarkdownToJsonConverter,
    @inject('FileSystemService') private readonly fileSystemService: IFileSystemService,
    @inject('ConfigProvider') private readonly configProvider: IConfigProvider // This is no longer used but kept for DI
  ) {}

  /**
   * Command name
   */
  get name(): string {
    return 'template:migrate';
  }

  /**
   * Configure command
   */
  configure(command: Command | Argv): Command | Argv {
    if (command instanceof Command) {
      return command
        .description('Migrate Markdown templates to JSON format')
        .option('-t, --template <template-id>', 'ID of specific template to migrate')
        .option('-f, --force', 'Overwrite existing JSON templates', false)
        .option('-d, --dry-run', 'Show what would be migrated without making changes', false);
    } else {
      return command
        .option('template', { alias: 't', describe: 'ID of specific template to migrate', type: 'string' })
        .option('force', { alias: 'f', describe: 'Overwrite existing JSON templates', type: 'boolean', default: false })
        .option('dry-run', { alias: 'd', describe: 'Show what would be migrated without making changes', type: 'boolean', default: false });
    }
  }

  /**
   * Execute command
   */
  async execute(options: any): Promise<void> {
    const { template, force, dryRun } = options;
    console.log(chalk.blue('Migrating templates from Markdown to JSON...'));

    // Get templates to migrate
    const templatesToMigrate = template
      ? this.templateMappings.filter(t => t.id === template)
      : this.templateMappings;

    if (templatesToMigrate.length === 0) {
      console.log(chalk.yellow(`No templates found for ID: ${template}`));
      return;
    }

    // Create output directory if it doesn't exist
    const jsonDir = path.join(process.cwd(), this.jsonTemplateDir);
    if (!dryRun) {
      await this.ensureDirectoryExists(jsonDir);
    }

    // Process each template
    for (const templateMapping of templatesToMigrate) {
      await this.migrateTemplate(templateMapping, force, dryRun);
    }

    console.log(chalk.green('Migration complete!'));
  }

  /**
   * Migrate a single template
   */
  private async migrateTemplate(mapping: TemplateMapping, force: boolean, dryRun: boolean): Promise<void> {
    console.log(chalk.blue(`Processing template: ${mapping.id}`));

    // Check if output file already exists
    const outputPath = path.join(
      process.cwd(),
      this.jsonTemplateDir,
      `${mapping.id}.json`
    );

    const outputExists = await this.fileSystemService.fileExists(outputPath);
    if (outputExists && !force) {
      console.log(chalk.yellow(`  JSON template already exists at ${outputPath}, skipping. Use --force to overwrite.`));
      return;
    }

    // Load legacy templates for each language
    const languageContents: Record<string, string> = {};
    let allSuccess = true;

    for (const [language, legacyPath] of Object.entries(mapping.legacyPaths)) {
      try {
        const fullPath = path.join(process.cwd(), this.legacyTemplateDir, legacyPath);
        const content = await this.fileSystemService.readFile(fullPath);
        console.log(chalk.green(`  Loaded ${language} template from ${fullPath}`));
        languageContents[language] = content;
      } catch (error) {
        console.log(chalk.yellow(`  Could not load ${language} template: ${(error as Error).message}`));
        allSuccess = false;
      }
    }

    if (!allSuccess) {
      console.log(chalk.yellow(`  Skipping ${mapping.id} due to missing source templates.`));
      return;
    }

    // Convert to JSON template
    const jsonTemplate = this.converter.convertMarkdownsToJsonTemplate(
      mapping.id,
      mapping.type,
      languageContents,
      mapping.names,
      mapping.descriptions
    );

    // Save JSON template
    if (!dryRun) {
      const json = JSON.stringify(jsonTemplate, null, 2);
      await this.fileSystemService.writeFile(outputPath, json);
      console.log(chalk.green(`  Saved JSON template to ${outputPath}`));
    } else {
      console.log(chalk.cyan(`  Would save JSON template to ${outputPath} (dry run)`));
    }
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const exists = await this.fileSystemService.directoryExists(dirPath);
    if (!exists) {
      await this.fileSystemService.createDirectory(dirPath);
      console.log(chalk.green(`Created directory: ${dirPath}`));
    }
  }
}
