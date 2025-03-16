import path from 'path';

/**
 * Path utilities for file system operations
 */
export class PathUtils {
  /**
   * Join path segments
   * @param paths Path segments to join
   * @returns Joined path
   */
  static join(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Get directory name from path
   * @param p Path
   * @returns Directory name
   */
  static dirname(p: string): string {
    return path.dirname(p);
  }

  /**
   * Get base name from path
   * @param p Path
   * @param ext Optional extension to remove
   * @returns Base name
   */
  static basename(p: string, ext?: string): string {
    return path.basename(p, ext);
  }

  /**
   * Get extension from path
   * @param p Path
   * @returns Extension
   */
  static extname(p: string): string {
    return path.extname(p);
  }

  /**
   * Normalize path
   * @param p Path
   * @returns Normalized path
   */
  static normalize(p: string): string {
    return path.normalize(p);
  }

  /**
   * Resolve path
   * @param paths Path segments to resolve
   * @returns Resolved path
   */
  static resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }
}
