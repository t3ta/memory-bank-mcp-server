/**
 * Represents version information for a document
 */
export class DocumentVersionInfo {
  private readonly _version: number;
  private readonly _lastModified: Date;
  private readonly _modifiedBy: string;
  private readonly _updateReason?: string;

  /**
   * Creates a new document version info
   * @param params Version info parameters
   */
  constructor({
    version,
    lastModified = new Date(),
    modifiedBy = 'system',
    updateReason,
  }: {
    version: number;
    lastModified?: Date;
    modifiedBy?: string;
    updateReason?: string;
  }) {
    this._version = version;
    this._lastModified = new Date(lastModified);
    this._modifiedBy = modifiedBy;
    this._updateReason = updateReason;
  }

  /**
   * Get the document version
   */
  public get version(): number {
    return this._version;
  }

  /**
   * Get the last modified date
   */
  public get lastModified(): Date {
    return new Date(this._lastModified);
  }

  /**
   * Get who modified the document
   */
  public get modifiedBy(): string {
    return this._modifiedBy;
  }

  /**
   * Get the reason for the update
   */
  public get updateReason(): string | undefined {
    return this._updateReason;
  }

  /**
   * Creates a new version info with incremented version
   * @param updateReason Optional update reason
   * @returns New version info
   */
  public nextVersion(updateReason?: string): DocumentVersionInfo {
    return new DocumentVersionInfo({
      version: this._version + 1,
      lastModified: new Date(),
      modifiedBy: this._modifiedBy,
      updateReason: updateReason || this._updateReason,
    });
  }

  /**
   * Converts version info to a plain object
   * @returns Plain object representation
   */
  public toObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      version: this._version,
      lastModified: this._lastModified,
      modifiedBy: this._modifiedBy,
    };

    if (this._updateReason) {
      result.updateReason = this._updateReason;
    }

    return result;
  }
}
