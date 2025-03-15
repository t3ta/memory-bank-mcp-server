import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WorkspaceConfig, CliOptions, Language } from '../models/types.js';

const execAsync = promisify(exec);

/**
 * Manages workspace configuration and initialization
 */
export class WorkspaceManager {
  private config: WorkspaceConfig | null = null;

  /**
   * Initialize the workspace configuration
   */
  async initialize(options?: CliOptions): Promise<WorkspaceConfig> {
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
    await this.ensureDirectories();

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

  /**
   * Get current git branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      const branchName = stdout.trim();

      if (!branchName.match(/^(feature|fix)\//)) {
        throw new Error('Current branch name must start with "feature/" or "fix/"');
      }

      return branchName;
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async resolveWorkspaceRoot(options?: CliOptions): Promise<string> {
    // Priority: CLI arg > env var > git root > current dir
    if (options?.workspace) {
      return this.validatePath(options.workspace);
    }

    if (process.env.WORKSPACE_ROOT) {
      return this.validatePath(process.env.WORKSPACE_ROOT);
    }

    try {
      const { stdout } = await execAsync('git rev-parse --show-toplevel');
      return stdout.trim();
    } catch {
      return process.cwd();
    }
  }

  private async resolveMemoryBankRoot(options?: CliOptions, workspaceRoot?: string): Promise<string> {
    // Priority: CLI arg > env var > default (workspace/docs)
    if (options?.memoryRoot) {
      return this.validatePath(options.memoryRoot);
    }

    if (process.env.MEMORY_BANK_ROOT) {
      return this.validatePath(process.env.MEMORY_BANK_ROOT);
    }

    return path.join(workspaceRoot || process.cwd(), 'docs');
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

  private async ensureDirectories(): Promise<void> {
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
