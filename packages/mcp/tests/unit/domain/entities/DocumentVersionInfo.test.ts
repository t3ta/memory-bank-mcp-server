import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加

describe('DocumentVersionInfo Unit Tests', () => {
  const initialVersion = 1;
  const initialDate = new Date('2024-01-01T00:00:00.000Z');
  const initialModifier = 'user1';
  const initialReason = 'Initial creation';

  describe('constructor', () => {
    it('should create an instance with specified values', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });

      expect(versionInfo.version).toBe(initialVersion);
      // Compare Date objects using getTime()
      expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
      expect(versionInfo.modifiedBy).toBe(initialModifier);
      expect(versionInfo.updateReason).toBe(initialReason);
    });

    it('should set default values for optional parameters', () => {
      const versionInfo = new DocumentVersionInfo({ version: initialVersion });

      expect(versionInfo.version).toBe(initialVersion);
      // lastModified should be close to the current time
      expect(versionInfo.lastModified.getTime()).toBeCloseTo(new Date().getTime(), -2); // Allow 100ms difference
      expect(versionInfo.modifiedBy).toBe('system'); // Default value
      expect(versionInfo.updateReason).toBeUndefined(); // Default value
    });

    it('should store a copy of the lastModified Date object', () => {
        const originalDate = new Date();
        const versionInfo = new DocumentVersionInfo({ version: 1, lastModified: originalDate });
        originalDate.setFullYear(2000); // Modify the original Date object
        expect(versionInfo.lastModified.getFullYear()).not.toBe(2000); // The copy should not be affected
      });
  });

  describe('getters', () => {
    const versionInfo = new DocumentVersionInfo({
      version: initialVersion,
      lastModified: initialDate,
      modifiedBy: initialModifier,
      updateReason: initialReason,
    });

    it('should return the correct value for the version getter', () => {
      expect(versionInfo.version).toBe(initialVersion);
    });

    it('should return a copy of the correct Date object for the lastModified getter', () => {
      const retrievedDate = versionInfo.lastModified;
      expect(retrievedDate.getTime()).toBe(initialDate.getTime());
      // Verify that modifying the retrieved Date object does not affect the original value
      retrievedDate.setFullYear(2000);
      expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
    });

    it('should return the correct value for the modifiedBy getter', () => {
      expect(versionInfo.modifiedBy).toBe(initialModifier);
    });

    it('should return the correct value for the updateReason getter', () => {
      expect(versionInfo.updateReason).toBe(initialReason);
    });

     it('should return undefined for updateReason when it is not defined', () => {
       const versionInfoNoReason = new DocumentVersionInfo({ version: 1 });
       expect(versionInfoNoReason.updateReason).toBeUndefined();
     });
  });

  describe('nextVersion', () => {
    const versionInfo = new DocumentVersionInfo({
      version: initialVersion,
      lastModified: initialDate,
      modifiedBy: initialModifier,
      updateReason: initialReason,
    });
    const nextReason = 'Updated content';

    it('should return a new instance with an incremented version', () => {
      const nextVersionInfo = versionInfo.nextVersion();
      expect(nextVersionInfo).toBeInstanceOf(DocumentVersionInfo);
      expect(nextVersionInfo.version).toBe(initialVersion + 1);
      expect(nextVersionInfo.modifiedBy).toBe(initialModifier); // modifiedBy should be carried over
      // lastModified should be updated
      expect(nextVersionInfo.lastModified.getTime()).toBeGreaterThan(initialDate.getTime());
      expect(nextVersionInfo.lastModified.getTime()).toBeCloseTo(new Date().getTime(), -2);
      // updateReason should be carried over if not specified
      expect(nextVersionInfo.updateReason).toBe(initialReason);
    });

    it('should set the specified updateReason', () => {
      const nextVersionInfo = versionInfo.nextVersion(nextReason);
      expect(nextVersionInfo.version).toBe(initialVersion + 1);
      expect(nextVersionInfo.updateReason).toBe(nextReason);
    });

     it('should not modify the original instance', () => {
       versionInfo.nextVersion();
       expect(versionInfo.version).toBe(initialVersion);
       expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
     });
  });

  describe('toObject', () => {
    it('should return the correct plain object (with updateReason)', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });
      const obj = versionInfo.toObject();
      expect(obj).toEqual({
        version: initialVersion,
        lastModified: initialDate, // Date object is included as is
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });
    });

    it('should return the correct plain object (without updateReason)', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
      });
      const obj = versionInfo.toObject();
      expect(obj).toEqual({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        // updateReason should not be included
      });
      expect(obj).not.toHaveProperty('updateReason');
    });
  });
});
