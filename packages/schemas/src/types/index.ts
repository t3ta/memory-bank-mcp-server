/**
 * Common Type Definitions
 * 
 * This file contains shared type definitions used across the schema package.
 */

/**
 * Type for validation error handling
 */
export type ValidationErrorType = {
  path?: string[];
  message: string;
};

/**
 * Type for validation result
 */
export type ValidationResult = {
  success: boolean;
  errors?: ValidationErrorType[];
};
