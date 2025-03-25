import { promises as fs } from 'node:fs';
import path from 'node:path';
import { IConfigProvider } from './interfaces/IConfigProvider.js';
import { WorkspaceConfig, CliOptions } from './WorkspaceConfig.js';

import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../shared/errors/InfrastructureError.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import type { Language } from '../../schemas/v2/i18n-schema.js';

/**
 * Implementation of configuration provider
 */
export class ConfigProvider implements IConfigProvider {
  private config: WorkspaceConfig | null = null;

  /**
   * Initialize configuration
   * @param options CLI options
   * @returns Promise resolving to workspace config
   */
  async initialize(options?: CliOptions): Promise<WorkspaceConfig> {
    try {
      if (this.config) return this.config;

      // Resolve workspace root
      const workspaceRoot = await this.resolveWorkspaceRoot(options);

      // Resolve memory bank root
      const memoryBankRoot = await this.resolveMemoryBankRoot(options, workspaceRoot);

      // Resolve language
      const language = await this.resolveLanguage(options);

      // Create config
      this.config = {
        workspaceRoot,
        memoryBankRoot,
        verbose: options?.verbose ?? false,
        language,
      };

      // Ensure required directories exist
      await this.ensureDirectories();

      return this.config;
    } catch (error) {
      if (error instanceof InfrastructureError || error instanceof DomainError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Failed to initialize configuration: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get current configuration
   * @returns Workspace config
   */
  getConfig(): WorkspaceConfig {
    if (!this.config) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        'Configuration not initialized'
      );
    }

    return this.config;
  }

  /**
   * Get global memory bank path
   * @returns Global memory bank path
   */
  getGlobalMemoryPath(): string {
    const config = this.getConfig();
    return path.join(config.memoryBankRoot, 'global-memory-bank');
  }

  /**
   * Get branch memory bank path
   * @param branchName Branch name
   * @returns Branch memory bank path
   */
  getBranchMemoryPath(branchName: string): string {
    try {
      const config = this.getConfig();

      // Validate branch name
      const branchInfo = BranchInfo.create(branchName);

      return path.join(config.memoryBankRoot, 'branch-memory-bank', branchInfo.safeName);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid branch name: ${branchName}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get language setting
   * @returns Language setting
   */
  getLanguage(): Language {
    return this.getConfig().language;
  }

  /**
   * Resolve workspace root directory
   * @param options CLI options
   * @returns Promise resolving to workspace root path
   */
  private async resolveWorkspaceRoot(options?: CliOptions): Promise<string> {
    try {
      // Priority: 
      // 1. Options directly passed to this function (highest priority)
      // 2. CLI args via process.argv
      // 3. Environment variables
      // 4. Current working directory (lowest priority)
      if (options?.workspace) {
        return await this.validatePath(options.workspace);
      }

      if (process.env.WORKSPACE_ROOT) {
        return await this.validatePath(process.env.WORKSPACE_ROOT);
      }

      return process.cwd();
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid workspace root: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Resolve memory bank root directory
   * @param options CLI options
   * @param workspaceRoot Workspace root directory
   * @returns Promise resolving to memory bank root path
   */
  private async resolveMemoryBankRoot(
    options?: CliOptions,
    workspaceRoot?: string
  ): Promise<string> {
    try {
      // Priority:
      // 1. Options directly passed to this function (highest priority)
      // 2. CLI args via process.argv
      // 3. Environment variables
      // 4. Default path (workspace/docs) (lowest priority)
      if (options?.memoryRoot) {
        return await this.validatePath(options.memoryRoot);
      }

      if (process.env.MEMORY_BANK_ROOT) {
        return await this.validatePath(process.env.MEMORY_BANK_ROOT);
      }

      const root = workspaceRoot || process.cwd();
      return path.resolve(root, 'docs');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid memory bank root: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Resolve language setting
   * @param options CLI options
   * @returns Promise resolving to language
   */
  private async resolveLanguage(options?: CliOptions): Promise<Language> {
    try {
      // Priority:
      // 1. Options directly passed to this function (highest priority)
      // 2. CLI args via process.argv
      // 3. Environment variables
      // 4. package.json config
      // 5. Default value (en) (lowest priority)
      if (options?.language) {
        return this.validateLanguage(options.language);
      }

      if (process.env.MEMORY_BANK_LANGUAGE) {
        return this.validateLanguage(process.env.MEMORY_BANK_LANGUAGE as Language);
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
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid language: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Validate language
   * @param language Language to validate
   * @returns Valid language
   */
  private validateLanguage(language: string): Language {
    if (language !== 'en' && language !== 'ja' && language !== 'zh') {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid language: ${language}. Supported languages are 'en', 'ja', and 'zh'.`
      );
    }

    return language as Language;
  }

  /**
   * Validate and normalize path
   * @param p Path to validate
   * @returns Promise resolving to validated path
   */
  private async validatePath(p: string): Promise<string> {
    try {
      if (!p) {
        throw new Error('Path cannot be empty');
      }

      const absolutePath = path.resolve(p);

      // Create directory if it doesn't exist
      try {
        await fs.access(absolutePath);
      } catch {
        await fs.mkdir(absolutePath, { recursive: true });
      }

      return absolutePath;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.CONFIGURATION_ERROR,
        `Invalid path: ${p}`,
        { originalError: error }
      );
    }
  }

  /**
   * Ensure required directories exist
   * @returns Promise resolving when directories are created
   */
  private async ensureDirectories(): Promise<void> {
    try {
      const config = this.getConfig();

      const dirs = [
        this.getGlobalMemoryPath(),
        path.join(config.memoryBankRoot, 'branch-memory-bank'),
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directories: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
