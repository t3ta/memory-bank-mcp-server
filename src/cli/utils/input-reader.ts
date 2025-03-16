import fs from 'fs/promises';

/**
 * Options for reading input
 */
interface ReadInputOptions {
  /**
   * Read from file path
   */
  file?: string;
}

/**
 * Read input from file or stdin
 * @param options Input options
 * @returns Promise resolving to input content as string
 */
export async function readInput(options: ReadInputOptions = {}): Promise<string> {
  // If file is specified, read from file
  if (options.file) {
    return fs.readFile(options.file, 'utf-8');
  }

  // Otherwise, read from stdin
  return new Promise((resolve) => {
    let data = '';
    
    const dataListener = (chunk: Buffer) => {
      data += chunk;
    };
    
    const endListener = () => {
      resolve(data);
    };

    process.stdin.on('data', dataListener);
    process.stdin.on('end', endListener);

    // Cleanup listeners when promise resolves
    process.stdin.once('end', () => {
      process.stdin.removeListener('data', dataListener);
      process.stdin.removeListener('end', endListener);
    });
  });
}
