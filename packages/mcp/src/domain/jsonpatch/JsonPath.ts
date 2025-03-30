import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

/**
 * Class encapsulating the path representation used in JSON Patch
 * Implementation of JSON Pointer compliant with RFC 6901
 */
export class JsonPath {
  private readonly _path: string;
  private readonly _segments: string[];

  /**
   * Constructor - Do not use directly, use the static factory method instead
   */
  private constructor(path: string, segments: string[]) {
    this._path = path;
    this._segments = segments;
  }

  /**
   * Create a JsonPath object from a path string
   * @param path JSON Pointer path string (e.g., '/a/b/c')
   * @returns New JsonPath instance
   * @throws DomainError if the path is invalid
   */
  static parse(path: string): JsonPath {
    if (!path) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Invalid JSON path: path cannot be empty'
      );
    }

    if (!path.startsWith('/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Invalid JSON path: must start with \'/\''
      );
    }

    // Remove leading slash and split
    const rawSegments = path === '/' ? [''] : path.substring(1).split('/');
    const segments: string[] = [];

    // Process escape sequences in each segment
    for (const segment of rawSegments) {
      let i = 0;
      let result = '';

      while (i < segment.length) {
        if (segment[i] === '~') {
          if (i + 1 >= segment.length) {
            throw new DomainError(
              DomainErrorCodes.INVALID_JSON_PATH,
              'Invalid JSON path: incomplete escape sequence'
            );
          }

          if (segment[i + 1] === '0') {
            result += '~';
          } else if (segment[i + 1] === '1') {
            result += '/';
          } else {
            throw new DomainError(
              DomainErrorCodes.INVALID_JSON_PATH,
              'Invalid JSON path: invalid escape sequence'
            );
          }
          i += 2;
        } else {
          result += segment[i];
          i += 1;
        }
      }

      segments.push(result);
    }

    return new JsonPath(path, segments);
  }

  /**
   * Generate the root path
   * @returns JsonPath instance representing the root path
   */
  static root(): JsonPath {
    return new JsonPath('/', ['']);
  }

  /**
   * Create a JsonPath object from an array of segments
   * @param segments Array of path segments
   * @returns New JsonPath instance
   */
  static fromSegments(segments: string[]): JsonPath {
    const escapedSegments = segments.map(segment => JsonPath.escapeSegment(segment));
    const path = '/' + escapedSegments.join('/');
    return new JsonPath(path, [...segments]);
  }

  /**
   * Escape a path segment
   * @param segment Segment to escape
   * @returns Escaped segment
   */
  static escapeSegment(segment: string): string {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1');
  }

  /**
   * Unescape an escaped path segment
   * @param segment Escaped segment
   * @returns Original segment
   */
  static unescapeSegment(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  /**
   * Get the path string
   */
  get path(): string {
    return this._path;
  }

  /**
   * Get the array of path segments
   */
  get segments(): readonly string[] {
    return this._segments;
  }

  /**
   * Check if the path is the root path
   * @returns true if it is the root path
   */
  isRoot(): boolean {
    return this._path === '/';
  }

  /**
   * Get the parent path
   * @returns JsonPath instance representing the parent path
   * @throws DomainError if called on the root path
   */
  parent(): JsonPath {
    if (this.isRoot()) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Root path has no parent'
      );
    }

    const parentSegments = this._segments.slice(0, -1);
    return JsonPath.fromSegments(parentSegments);
  }

  /**
   * Get the last segment of the path
   * @returns The last segment
   */
  lastSegment(): string {
    return this._segments[this._segments.length - 1];
  }

  /**
   * Generate a child path
   * @param childSegment Child segment
   * @returns New JsonPath instance
   */
  child(childSegment: string): JsonPath {
    const newSegments = [...this._segments, childSegment];
    return JsonPath.fromSegments(newSegments);
  }

  /**
   * Check if the path points to an array element
   * @returns true if the path points to an array element
   */
  isArrayElement(): boolean {
    const lastSegment = this.lastSegment();
    return lastSegment === '-' || /^\d+$/.test(lastSegment);
  }

  /**
   * Check if the path points to the end of an array for appending
   * @returns true if the path points to the end of an array
   */
  isArrayAppend(): boolean {
    return this.lastSegment() === '-';
  }

  /**
   * Check path equality
   * @param other JsonPath to compare against
   * @returns true if equal
   */
  equals(other: JsonPath): boolean {
    return this._path === other._path;
  }

  /**
   * Get the string representation
   * @returns Path string
   */
  toString(): string {
    return this._path;
  }
}
