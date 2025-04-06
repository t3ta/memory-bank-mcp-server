import {
  // Import one representative schema/type from each exported file
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
  GenericDocumentJsonV2Schema,
  // 未使用の型インポートを削除
  // BranchContextContentV2,
  // ActiveContextContentV2,
  // ProgressContentV2,
  // SystemPatternsContentV2,
  // GenericDocumentContentV2,
} from '@memory-bank/schemas/document-types'; // Import using package path defined in exports

describe('Document Types Index Exports (src/document-types/index.ts)', () => {

  it('should export items from branch-context', () => {
    expect(BranchContextJsonV2Schema).toBeDefined();
    // expect(BranchContextContentV2).toBeDefined(); // Cannot check type exports at runtime
  });

  it('should export items from active-context', () => {
    expect(ActiveContextJsonV2Schema).toBeDefined();
    // expect(ActiveContextContentV2).toBeDefined();
  });

  it('should export items from progress', () => {
    expect(ProgressJsonV2Schema).toBeDefined();
    // expect(ProgressContentV2).toBeDefined();
  });

  it('should export items from system-patterns', () => {
    expect(SystemPatternsJsonV2Schema).toBeDefined();
    // expect(SystemPatternsContentV2).toBeDefined();
  });

  it('should export items from generic', () => {
    expect(GenericDocumentJsonV2Schema).toBeDefined();
    // expect(GenericDocumentContentV2).toBeDefined();
  });

});
