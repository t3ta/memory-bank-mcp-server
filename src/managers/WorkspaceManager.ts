import { promises as fs } from 'fs';
import path from 'path';
import { WorkspaceConfig, CliOptions, Language } from '../models/types.js';

/**
 * Manages workspace configuration and initialization
 */
export class WorkspaceManager {
  private config: WorkspaceConfig | null = null;

  /**
   * Initialize the workspace configuration
   */
  async initialize(options?: CliOptions, branchName: string = 'main'): Promise<WorkspaceConfig> {
    if (this.config) return this.config;

    // Resolve workspace root path
    const workspaceRoot = await this.resolveWorkspaceRoot(options);
    const memoryBankRoot = await this.resolveMemoryBankRoot(options, workspaceRoot);
    const language = await this.resolveLanguage(options);

    this.config = {
      workspaceRoot,
      memoryBankRoot,
      verbose: options?.verbose ?? false,
      language
    };

    // Ensure required directories exist
    await this.ensureDirectories(branchName);

    return this.config;
  }

  /**
   * Get the current configuration
   */
  getConfig(): WorkspaceConfig {
    if (!this.config) {
      throw new Error('WorkspaceManager not initialized');
    }
    return this.config;
  }

  /**
   * Resolve global memory bank path
   */
  getGlobalMemoryPath(): string {
    const config = this.getConfig();
    return path.join(config.memoryBankRoot, 'global-memory-bank');
  }

  /**
   * Resolve branch memory bank path
   */
  getBranchMemoryPath(branchName: string): string {
    const config = this.getConfig();
    const safeBranchName = this.sanitizeBranchName(branchName);
    return path.join(config.memoryBankRoot, 'branch-memory-bank', safeBranchName);
  }

  private async resolveWorkspaceRoot(options?: CliOptions): Promise<string> {
    // Priority: CLI arg > env var > current dir
    if (options?.workspace) {
      return this.validatePath(options.workspace);
    }

    if (process.env.WORKSPACE_ROOT) {
      return this.validatePath(process.env.WORKSPACE_ROOT);
    }

    return process.cwd();
  }

  private async resolveMemoryBankRoot(options?: CliOptions, workspaceRoot?: string): Promise<string> {
    // Priority: CLI arg > env var > default (workspace/docs)
    if (options?.memoryRoot) {
      return this.validatePath(options.memoryRoot);
    }

    if (process.env.MEMORY_BANK_ROOT) {
      return this.validatePath(process.env.MEMORY_BANK_ROOT);
    }

    const root = workspaceRoot || process.cwd();
    return path.resolve(root, 'docs');
  }

  private async resolveLanguage(options?: CliOptions): Promise<Language> {
    // Priority: CLI arg > env var > package.json config > default (en)
    if (options?.language) {
      return this.validateLanguage(options.language);
    }

    if (process.env.MEMORY_BANK_LANGUAGE) {
      return this.validateLanguage(process.env.MEMORY_BANK_LANGUAGE);
    }

    try {
      // Try to read from package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.config?.language) {
        return this.validateLanguage(packageJson.config.language);
      }
    } catch {
      // Ignore errors reading package.json
    }

    return 'en';
  }

  private validateLanguage(lang: string): Language {
    if (lang !== 'en' && lang !== 'ja') {
      throw new Error('Invalid language. Supported languages are "en" and "ja"');
    }
    return lang;
  }

  private async validatePath(p: string): Promise<string> {
    const absolutePath = path.resolve(p);

    try {
      await fs.access(absolutePath);
    } catch {
      await fs.mkdir(absolutePath, { recursive: true });
    }

    return absolutePath;
  }

  private async ensureDirectories(branchName: string): Promise<void> {
    const config = this.getConfig();
    const dirs = [
      this.getGlobalMemoryPath(),
      path.join(config.memoryBankRoot, 'branch-memory-bank')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private sanitizeBranchName(branchName: string): string {
    // Convert slashes to dashes for safe directory names
    return branchName.replace(/\//g, '-');
  }
}
