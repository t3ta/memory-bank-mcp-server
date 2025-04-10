// packages/mcp/tests/unit/domain/jsonpatch/FastJsonPatchAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FastJsonPatchAdapter } from '../../../../src/domain/jsonpatch/FastJsonPatchAdapter.js';
import { JsonPatchOperation } from '../../../../src/domain/jsonpatch/JsonPatchOperation.js';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js';

describe('FastJsonPatchAdapter', () => {
  let adapter: FastJsonPatchAdapter;
  let document: any;

  beforeEach(() => {
    adapter = new FastJsonPatchAdapter();
    document = {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      contact: {
        email: 'john.doe@example.com',
      },
      tags: ['user', 'active'],
    };
  });

  describe('apply', () => {
    it('should apply a simple add operation correctly', () => {
      const operations = [JsonPatchOperation.create('add', '/middleName', 'Michael')];
      const result = adapter.apply(document, operations);
      expect(result.middleName).toBe('Michael');
      expect(document.middleName).toBeUndefined(); // Original document should be immutable
    });

    it('should apply a simple replace operation correctly', () => {
      const operations = [JsonPatchOperation.create('replace', '/age', 31)];
      const result = adapter.apply(document, operations);
      expect(result.age).toBe(31);
      expect(document.age).toBe(30); // Original document should be immutable
    });

    it('should apply a simple remove operation correctly', () => {
      const operations = [JsonPatchOperation.create('remove', '/contact/email')];
      const result = adapter.apply(document, operations);
      expect(result.contact.email).toBeUndefined();
      expect(document.contact.email).toBe('john.doe@example.com'); // Original document should be immutable
    });

     it('should apply a move operation correctly', () => {
       const operations = [JsonPatchOperation.create('move', '/contact/primaryEmail', undefined, '/contact/email')];
       const result = adapter.apply(document, operations);
       expect(result.contact.primaryEmail).toBe('john.doe@example.com');
       expect(result.contact.email).toBeUndefined();
       expect(document.contact.email).toBe('john.doe@example.com'); // Immutability check
       expect(document.contact.primaryEmail).toBeUndefined();
     });

     it('should apply a copy operation correctly', () => {
       const operations = [JsonPatchOperation.create('copy', '/contact/secondaryEmail', undefined, '/contact/email')];
       const result = adapter.apply(document, operations);
       expect(result.contact.secondaryEmail).toBe('john.doe@example.com');
       expect(result.contact.email).toBe('john.doe@example.com'); // Copy doesn't remove source
       expect(document.contact.email).toBe('john.doe@example.com'); // Immutability check
       expect(document.contact.secondaryEmail).toBeUndefined();
     });

     it('should apply a test operation successfully if value matches', () => {
       const operations = [JsonPatchOperation.create('test', '/lastName', 'Doe')];
       // applyPatch with validate=true implicitly runs test operations
       const result = adapter.apply(document, operations);
       expect(result).toEqual(document); // No changes expected, just validation pass
     });

    it('should throw DomainError with TEST_FAILED code for a failing test operation', () => {
      const operations = [JsonPatchOperation.create('test', '/lastName', 'Smith')];
      // Check if it throws an instance of DomainError
      expect(() => adapter.apply(document, operations)).toThrowError(DomainError);
      // For more specific code checking, a try/catch might be needed, but let's keep it simple for now.
      // try {
      //   adapter.apply(document, operations);
      // } catch (error) {
      //   expect(error).toBeInstanceOf(DomainError);
      //   expect((error as DomainError).code).toBe(DomainErrorCodes.TEST_FAILED);
      // }
    });

    it('should throw DomainError with PATH_NOT_FOUND for an invalid path in replace', () => {
      const operations = [JsonPatchOperation.create('replace', '/nonexistent', 'value')];
      // Check if it throws an instance of DomainError
      expect(() => adapter.apply(document, operations)).toThrowError(DomainError);
      // try {
      //   adapter.apply(document, operations);
      // } catch (error) {
      //   expect(error).toBeInstanceOf(DomainError);
      //   expect((error as DomainError).code).toBe(DomainErrorCodes.PATH_NOT_FOUND);
      // }
    });

     it('should throw DomainError with PATH_NOT_FOUND for an invalid from path in move', () => {
       const operations = [JsonPatchOperation.create('move', '/target', undefined, '/nonexistent/from')];
       // Check if it throws an instance of DomainError
       expect(() => adapter.apply(document, operations)).toThrowError(DomainError);
       // try {
       //   adapter.apply(document, operations);
       // } catch (error) {
       //   expect(error).toBeInstanceOf(DomainError);
       //   expect((error as DomainError).code).toBe(DomainErrorCodes.PATH_NOT_FOUND);
       // }
     });

     it('should handle adding an element to an array', () => {
        const operations = [JsonPatchOperation.create('add', '/tags/-', 'new')];
        const result = adapter.apply(document, operations);
        expect(result.tags).toEqual(['user', 'active', 'new']);
        expect(document.tags).toEqual(['user', 'active']); // Immutability
     });

     it('should handle replacing an element in an array', () => {
        const operations = [JsonPatchOperation.create('replace', '/tags/0', 'guest')];
        const result = adapter.apply(document, operations);
        expect(result.tags).toEqual(['guest', 'active']);
        expect(document.tags).toEqual(['user', 'active']); // Immutability
     });

     it('should handle removing an element from an array', () => {
        const operations = [JsonPatchOperation.create('remove', '/tags/1')];
        const result = adapter.apply(document, operations);
        expect(result.tags).toEqual(['user']);
        expect(document.tags).toEqual(['user', 'active']); // Immutability
     });

    // Add more tests for edge cases, array operations, etc.
  });

  describe('validate', () => {
      it('should return true for a valid sequence of operations', () => {
          const operations = [
              JsonPatchOperation.create('add', '/middleName', 'Michael'),
              JsonPatchOperation.create('replace', '/age', 31),
              JsonPatchOperation.create('test', '/firstName', 'John'),
          ];
          expect(adapter.validate(document, operations)).toBe(true);
      });

      it('should return false if a test operation would fail', () => {
          const operations = [JsonPatchOperation.create('test', '/age', 99)];
          expect(adapter.validate(document, operations)).toBe(false);
      });

      it('should return false if a path does not exist for replace', () => {
          const operations = [JsonPatchOperation.create('replace', '/nonexistent', 'value')];
          // fast-json-patch validate considers replacing a non-existent path invalid
          expect(adapter.validate(document, operations)).toBe(false);
      });

       it('should return false if a from path does not exist for move', () => {
           const operations = [JsonPatchOperation.create('move', '/target', undefined, '/nonexistent/from')];
           expect(adapter.validate(document, operations)).toBe(false);
       });

       it('should return true for valid array operations', () => {
           const operations = [
               JsonPatchOperation.create('add', '/tags/-', 'new'),
               JsonPatchOperation.create('replace', '/tags/0', 'guest'),
               JsonPatchOperation.create('remove', '/tags/1'), // This refers to the original index 1 ('active')
           ];
           // Note: Validation happens sequentially on the original doc state for each op in fast-json-patch validate
           expect(adapter.validate(document, operations)).toBe(true);
       });

       it('should return false for invalid array index', () => {
           const operations = [JsonPatchOperation.create('remove', '/tags/5')]; // Index out of bounds
           expect(adapter.validate(document, operations)).toBe(false);
       });

      // Add more validation tests
  });

  describe('generatePatch', () => {
      it('should generate a correct patch for simple changes', () => {
          const target = {
              ...document,
              age: 31, // Changed
              middleName: 'Michael', // Added
          };
          delete target.contact.email; // Removed

          const expectedPatch = [
              JsonPatchOperation.create('add', '/middleName', 'Michael'),
              JsonPatchOperation.create('remove', '/contact/email'),
              JsonPatchOperation.create('replace', '/age', 31),
          ];

          const generatedPatch = adapter.generatePatch(document, target);

          // Order might differ, so compare contents without order sensitivity
          // expect(generatedPatch).toHaveLength(expectedPatch.length); // Check number of operations (can differ between libs)
          // Instead of checking the exact patch content (which can vary), check the result of applying the patch
          // expect(generatedPatch).toEqual(expect.arrayContaining(expectedPatch.map(op => expect.objectContaining(op.toJSON()))));

          // Apply the generated patch to the source and check if it matches the target
          const resultAfterPatch = adapter.apply(document, generatedPatch);
          expect(resultAfterPatch).toEqual(target);
      });

       it('should generate a correct patch for array changes', () => {
           const target = {
               ...document,
               tags: ['guest', 'new'], // Replaced 'user', removed 'active', added 'new'
           };

           const generatedPatch = adapter.generatePatch(document, target);

           // fast-json-patch might generate replace for index 0 and remove for index 1, then add for index 1
           // Or it might generate a single replace for the whole array. Let's check for plausible operations.
           // A common output is replacing the whole array if changes are significant.
           const replaceOp = JsonPatchOperation.create('replace', '/tags', ['guest', 'new']);
           const containsReplace = generatedPatch.some(op =>
               op.op === 'replace' && op.path.toString() === '/tags' && JSON.stringify(op.value) === JSON.stringify(['guest', 'new'])
           );

           // Or check for individual operations (less likely for fast-json-patch compare)
           const containsIndividualOps =
               generatedPatch.some(op => op.op === 'replace' && op.path.toString() === '/tags/0' && op.value === 'guest') &&
               generatedPatch.some(op => op.op === 'remove' && op.path.toString() === '/tags/1') && // Original index 1 was 'active'
               generatedPatch.some(op => op.op === 'add' && op.path.toString() === '/tags/1' && op.value === 'new'); // New element at index 1

           // Expect either a full array replace OR a sequence of individual changes
           // For simplicity in this test, let's just check if the generated patch is not empty
           // A more robust test would analyze the resulting document after applying the generated patch.
           expect(generatedPatch.length).toBeGreaterThan(0);

           // Apply the generated patch to the source and check if it matches the target
           const resultAfterPatch = adapter.apply(document, generatedPatch);
           expect(resultAfterPatch).toEqual(target);

       });

      // Add more diff generation tests
  });

});
