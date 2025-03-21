/**
 * CLI Runner utility for executing Memory Bank CLI commands in E2E tests
 */

import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Options for CLI command execution
 */
export interface CliRunOptions {
  /**
   * Working directory for the CLI process
   */
  cwd?: string;
  
  /**
   * Environment variables to pass to the CLI process
   */
  env?: Record<string, string>;
  
  /**
   * Optional timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Result of a CLI command execution
 */
export interface CliRunResult {
  /**
   * Command exit code
   */
  exitCode: number;
  
  /**
   * Standard output
   */
  stdout: string;
  
  /**
   * Standard error
   */
  stderr: string;
}

/**
 * Executes a Memory Bank CLI command and returns the result
 * 
 * @param args CLI command arguments
 * @param options Execution options
 * @returns Promise resolving to the command execution result
 */
export async function runCli(
  args: string[],
  options: CliRunOptions = {}
): Promise<CliRunResult> {
  const cliPath = path.resolve(process.cwd(), 'dist/cli/index.js');
  const cwd = options.cwd || process.cwd();
  const env = { ...process.env, ...options.env };
  const timeout = options.timeout || 10000; // Default 10 second timeout
  
  return new Promise<CliRunResult>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Set timeout if specified
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill();
        }
        reject(new Error(`CLI command timed out after ${timeout}ms`));
      }, timeout);
    }
    
    // Spawn CLI process
    const childProcess = spawn('node', [cliPath, ...args], {
      cwd,
      env,
      stdio: 'pipe',
    });
    
    // Collect stdout
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    childProcess.on('close', (exitCode) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      resolve({
        exitCode: exitCode || 0,
        stdout,
        stderr,
      });
    });
    
    // Handle process errors
    childProcess.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      reject(new Error(`Failed to execute CLI command: ${error.message}`));
    });
  });
}

/**
 * Executes a Memory Bank CLI command and expects it to succeed
 * 
 * @param args CLI command arguments
 * @param options Execution options
 * @returns Promise resolving to the command execution result
 * @throws Error if the command exits with a non-zero code
 */
export async function runCliSuccessful(
  args: string[],
  options: CliRunOptions = {}
): Promise<CliRunResult> {
  const result = await runCli(args, options);
  
  if (result.exitCode !== 0) {
    throw new Error(
      `CLI command failed with exit code ${result.exitCode}.\n` +
      `Command: memory-bank ${args.join(' ')}\n` +
      `STDOUT: ${result.stdout}\n` +
      `STDERR: ${result.stderr}`
    );
  }
  
  return result;
}

/**
 * Executes a Memory Bank CLI command and expects it to fail
 * 
 * @param args CLI command arguments
 * @param options Execution options
 * @returns Promise resolving to the command execution result
 * @throws Error if the command exits with a zero code
 */
export async function runCliFailing(
  args: string[],
  options: CliRunOptions = {}
): Promise<CliRunResult> {
  const result = await runCli(args, options);
  
  if (result.exitCode === 0) {
    throw new Error(
      `CLI command succeeded but was expected to fail.\n` +
      `Command: memory-bank ${args.join(' ')}\n` +
      `STDOUT: ${result.stdout}\n` +
      `STDERR: ${result.stderr}`
    );
  }
  
  return result;
}
