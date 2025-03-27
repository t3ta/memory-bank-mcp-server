/**
 * Tests for types definitions
 */
import { ValidationErrorType, ValidationResult } from '../../src/types/index.js';

describe('ValidationErrorType', () => {
  it('should be defined', () => {
    // Type-checking test - just ensure the type is exported
    const validateType = (error: ValidationErrorType): ValidationErrorType => {
      return error;
    };
    
    // Simple validation with runtime error object
    const sampleError: ValidationErrorType = {
      message: 'Test error message'
    };
    
    expect(validateType(sampleError).message).toBe('Test error message');
  });
  
  it('should support optional path property', () => {
    const errorWithPath: ValidationErrorType = {
      message: 'Error with path',
      path: ['field', 'subfield']
    };
    
    // Ensure path is accessible
    expect(errorWithPath.path).toBeDefined();
    expect(errorWithPath.path?.length).toBe(2);
    expect(errorWithPath.path?.[0]).toBe('field');
  });
});

describe('ValidationResult', () => {
  it('should handle successful validation', () => {
    const successResult: ValidationResult = {
      success: true
    };
    
    expect(successResult.success).toBe(true);
    expect(successResult.errors).toBeUndefined();
  });
  
  it('should handle failed validation with errors', () => {
    const failResult: ValidationResult = {
      success: false,
      errors: [
        {
          message: 'Field is required'
        },
        {
          message: 'Invalid format',
          path: ['document', 'field']
        }
      ]
    };
    
    expect(failResult.success).toBe(false);
    expect(failResult.errors).toBeDefined();
    expect(failResult.errors?.length).toBe(2);
    
    // Check error properties
    if (failResult.errors) {
      expect(failResult.errors[0].message).toBe('Field is required');
      expect(failResult.errors[1].path).toContain('field');
    }
  });
});
