import { z } from 'zod';
import { TagSchema } from '../common.js';

/**
 * Schema for a tag index entry.
 * Maps a tag to the documents that contain it.
 */
export const TagIndexEntrySchema = z.object({
  // The tag value (without #)
  tag: TagSchema,
  
  // Array of document paths that have this tag
  documentPaths: z.array(z.string()),
  
  // Optional count of documents with this tag (for optimization)
  documentCount: z.number().int().nonnegative().optional(),
  
  // Optional last updated timestamp
  updatedAt: z.string().datetime().optional()
});

/**
 * Schema for the tag index file.
 * This is the root schema for the JSON file.
 */
export const TagIndexSchema = z.object({
  // Schema version for future compatibility
  schema: z.literal('tag_index_v1'),
  
  // Metadata about the index
  metadata: z.object({
    // When the index was created/updated
    updatedAt: z.string().datetime(),
    
    // Total number of documents indexed
    documentCount: z.number().int().nonnegative(),
    
    // Whether this was a full rebuild
    fullRebuild: z.boolean().default(false),
    
    // The context of the index (branch name or 'global')
    context: z.string(),
    
    // Optional description
    description: z.string().optional()
  }),
  
  // The actual tag index entries
  // We use a Record for O(1) lookups with tag as key
  index: z.record(z.string(), z.array(z.string()))
});

// Type exports
export type TagIndexEntry = z.infer<typeof TagIndexEntrySchema>;
export type TagIndex = z.infer<typeof TagIndexSchema>;
