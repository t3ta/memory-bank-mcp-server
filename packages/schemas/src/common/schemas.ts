/**
 * Common Schema Definitions
 *
 * This file contains common schema definitions used across the application.
 * These are extracted to avoid circular dependencies between schema files.
 */

import { z } from 'zod';

// Utility for flexible date parsing
export const dateStringToDate = (val: string, ctx: z.RefinementCtx): Date | typeof z.NEVER => {
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid date format: ${val}`,
      });
      return z.NEVER;
    }
    return date;
  } catch (err) {
    // エラーメッセージはctx.addIssueで既に記録されるので、console.errorは不要
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Failed to parse date: ${val}`,
    });
    return z.NEVER;
  }
};

// Flexible date schema that accepts both Date objects and strings
export const FlexibleDateSchema = z.union([z.date(), z.string().transform(dateStringToDate)]);

// Basic tag schema
export const TagSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Tag must contain only lowercase letters, numbers, and hyphens');
