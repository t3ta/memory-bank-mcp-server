import { promises as fs } from 'fs';
import path from 'path';
import { WorkspaceConfig, CliOptions, Language } from '../models/types.js';
import { MemoryBankError } from '../errors/MemoryBankError.js';
import {
  WorkspaceConfigSchema,
  CliOptionsSchema,
  LanguageSchema,
  PathSchema,
  BranchNameSchema
} from '../schemas/index.js';

/**
 * Manages workspace configuration and initialization
 */
export class WorkspaceManager {
  private config: WorkspaceConfig | null = null;

  /**
   * Initialize the workspace configuration
   */
  async initialize(options?: CliOptions, branchName: string = 'main'): Promise<WorkspaceConfig> {
    try {
      if (this.config) return this.config;

      // Validate options if provided
      if (options) {
        options = CliOptionsSchema.parse(options);
      }

      // Resolve and validate paths and language
      const workspaceRoot = await this.resolveWorkspaceRoot(options);
      const memoryBankRoot = await this.resolveMemoryBankRoot(options, workspaceRoot);
      const language = await this.resolveLanguage(options);

      // Validate branch name
      if (branchName !== 'main') {
        try {
          BranchNameSchema.parse(branchName);
        } catch {
          throw MemoryBankError.invalidBranchName(branchName);
        }
      }

      // Create and validate config
      const config = {
        workspaceRoot,
        memoryBankRoot,
        verbose: options?.verbose ?? false,
        language
      };

      this.config = WorkspaceConfigSchema.parse(config);

      // Ensure required directories exist
      await this.ensureDirectories(branchName);

      return this.config;
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('initialize', 'workspace', error as Error);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): WorkspaceConfig {
    if (!this.config) {
      throw MemoryBankError.fileSystemError('config', 'workspace', new Error('WorkspaceManager not initialized'));
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
    try {
      const config = this.getConfig();
      const safeBranchName = this.sanitizeBranchName(branchName);
      return path.join(config.memoryBankRoot, 'branch-memory-bank', safeBranchName);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.invalidPath(branchName, 'Invalid branch path');
    }
  }

  private async resolveWorkspaceRoot(options?: CliOptions): Promise<string> {
    try {
      // Priority: CLI arg > env var > current dir
      if (options?.workspace) {
        return await this.validatePath(options.workspace);
      }

      if (process.env.WORKSPACE_ROOT) {
        return await this.validatePath(process.env.WORKSPACE_ROOT);
      }

      return process.cwd();
    } catch (error) {
      throw MemoryBankError.invalidPath('workspace root', (error as Error).message);
    }
  }

  private async resolveMemoryBankRoot(options?: CliOptions, workspaceRoot?: string): Promise<string> {
    try {
      // Priority: CLI arg > env var > default (workspace/docs)
      if (options?.memoryRoot) {
        return await this.validatePath(options.memoryRoot);
      }

      if (process.env.MEMORY_BANK_ROOT) {
        return await this.validatePath(process.env.MEMORY_BANK_ROOT);
      }

      const root = workspaceRoot || process.cwd();
      return path.resolve(root, 'docs');
    } catch (error) {
      throw MemoryBankError.invalidPath('memory bank root', (error as Error).message);
    }
  }

  private async resolveLanguage(options?: CliOptions): Promise<Language> {
    try {
      // Priority: CLI arg > env var > package.json config > default (en)
      if (options?.language) {
        return LanguageSchema.parse(options.language);
      }

      if (process.env.MEMORY_BANK_LANGUAGE) {
        return LanguageSchema.parse(process.env.MEMORY_BANK_LANGUAGE);
      }

      try {
        // Try to read from package.json
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (packageJson.config?.language) {
          return LanguageSchema.parse(packageJson.config.language);
        }
      } catch {
        // Ignore errors reading package.json
      }

      return 'en';
    } catch (error) {
      throw new Error(`Invalid language: ${(error as Error).message}`);
    }
  }

  private async validatePath(p: string): Promise<string> {
    try {
      const validatedPath = PathSchema.parse(p);
      const absolutePath = path.resolve(validatedPath);

      try {
        await fs.access(absolutePath);
      } catch {
        await fs.mkdir(absolutePath, { recursive: true });
      }

      return absolutePath;
    } catch (error) {
      throw MemoryBankError.invalidPath(p, (error as Error).message);
    }
  }

  private async ensureDirectories(branchName: string): Promise<void> {
    try {
      const config = this.getConfig();
      const dirs = [
        this.getGlobalMemoryPath(),
        path.join(config.memoryBankRoot, 'branch-memory-bank')
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }
    } catch (error) {
      throw MemoryBankError.fileSystemError('ensure-directories', 'workspace', error as Error);
    }
  }

  private sanitizeBranchName(branchName: string): string {
    try {
      // Validate branch name before sanitizing
      if (branchName !== 'main') {
        BranchNameSchema.parse(branchName);
      }
      // Convert slashes to dashes for safe directory names
      return branchName.replace(/\//g, '-');
    } catch (error) {
      throw MemoryBankError.invalidBranchName(branchName);
    }
  }
}
